
(() => {
    "use strict";

    // Active-hole map module. Hirvihaara + Peurunka + Gumböle + Ringside use the same
    // rendering, GPS hole detection and sofa-test behavior.
    const COURSE_CONFIGS = {
        hirvihaara: {
            name: "Hirvihaara",
            boardUrl: "data/maps/FI/hirvihaara-holeboards.json?v=3.7.30"
        },
        peurunkagolf: {
            name: "Peurunka",
            boardUrl: "data/maps/FI/peurunka-holeboards.json?v=3.7.30"
        },
        gumbole: {
            name: "Gumböle",
            boardUrl: "data/maps/FI/gumbole-holeboards.json?v=3.7.30"
        },
        ringside: {
            name: "Espoo Ringside Golf",
            boardUrl: "data/maps/FI/ringside-holeboards.json?v=3.7.30"
        }
    };
    const GPS_FIX_LIMIT_METERS = 5;
    const CONFIRM_FIXES = 3;
    const FIRST_HOLE_MAX_METERS = 70;
    const SWITCH_HOLE_MAX_METERS = 60;

    let boardData = null;
    let activeCourseId = null;
    const boardCache = new Map();
    const boardLoads = new Map();
    let map = null;
    let holeLayer = null;
    let playerMarker = null;
    let currentHole = null;
    let candidateHole = null;
    let candidateCount = 0;
    let lastPosition = null;
    let currentProject = null;

    const panel = document.getElementById("hirvihaaraMapPanel");
    const mapEl = document.getElementById("hirvihaaraMap");
    const statusEl = document.getElementById("hirvihaaraMapStatus");
    const courseSelect = document.getElementById("courseSelect");
    const gpsStatus = document.getElementById("gpsStatus");
    const gpsAccuracy = document.getElementById("gpsAccuracy");
    const gpsLatitude = document.getElementById("gpsLatitude");
    const gpsLongitude = document.getElementById("gpsLongitude");
    const sofaTest = document.getElementById("hirvihaaraSofaTest");
    const testHoleSelect = document.getElementById("hirvihaaraTestHole");
    const testButton = document.getElementById("hirvihaaraTestButton");

    if (!panel || !mapEl || typeof L === "undefined") return;

    if (testHoleSelect) {
        for (let n=1; n<=18; n++) {
            const option=document.createElement("option");
            option.value=String(n);
            option.textContent=`Väylä ${n}`;
            testHoleSelect.appendChild(option);
        }
    }

    function tags(f) {
        const p = f?.properties || {};
        return p.tags || p;
    }

    function styleFeature(f) {
        const t = tags(f);
        const g = t.golf;
        if (g === "fairway") return { color:"#376f35", weight:2, fillColor:"#7fb566", fillOpacity:.96 };
        if (g === "green") return { color:"#0f5f2f", weight:3, fillColor:"#3f9f55", fillOpacity:1 };
        if (g === "tee") return { color:"#3f6d36", weight:2, fillColor:"#a9cf8d", fillOpacity:.98 };
        if (g === "bunker") return { color:"#967d42", weight:2, fillColor:"#e5ce86", fillOpacity:1 };
        if (g === "water_hazard" || g === "lateral_water_hazard" || t.natural === "water" || t.water) {
            return { color:"#2875aa", weight:2, fillColor:"#78b9df", fillOpacity:.9 };
        }
        if (t.waterway) return { color:"#2875aa", weight:4, opacity:.95 };
        if (g === "rough") return { color:"#60854e", weight:1, fillColor:"#99ba7e", fillOpacity:.65 };
        return { color:"#6d8d5c", weight:1, fillColor:"#a9c790", fillOpacity:.45 };
    }

    function longestLineCoords(f) {
        if (!f?.geometry) return null;
        if (f.geometry.type === "LineString") return f.geometry.coordinates;
        if (f.geometry.type === "MultiLineString") {
            return f.geometry.coordinates.reduce((a,b) => a.length >= b.length ? a : b, []);
        }
        return null;
    }

    function transformPoint(coord, origin, angle, cosLat) {
        const x = (coord[0] - origin[0]) * cosLat;
        const y = coord[1] - origin[1];
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const xr = x * c - y * s;
        const yr = x * s + y * c;
        return [origin[0] + xr / cosLat, origin[1] + yr];
    }

    function transformCoords(value, origin, angle, cosLat) {
        if (!Array.isArray(value)) return value;
        if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
            return transformPoint(value, origin, angle, cosLat);
        }
        return value.map(v => transformCoords(v, origin, angle, cosLat));
    }

    function transformedHole(h) {
        const coords = longestLineCoords(h.line);
        if (!coords || coords.length < 2) {
            return { features:h.features, line:h.line, project:x=>x };
        }

        const tee = coords[0];
        const green = coords[coords.length - 1];
        const origin = [(tee[0] + green[0]) / 2, (tee[1] + green[1]) / 2];
        const cosLat = Math.cos(origin[1] * Math.PI / 180);
        const dx = (green[0] - tee[0]) * cosLat;
        const dy = green[1] - tee[1];
        const current = Math.atan2(dy, dx);
        const portrait = window.innerHeight > window.innerWidth;
        const target = portrait ? Math.PI / 2 : 0;
        const angle = target - current;

        const rotateCoord = coord => transformPoint(coord, origin, angle, cosLat);
        const transformFeature = f => {
            const q = JSON.parse(JSON.stringify(f));
            q.geometry.coordinates = transformCoords(q.geometry.coordinates, origin, angle, cosLat);
            return q;
        };

        let features = h.features.map(transformFeature);
        let line = transformFeature(h.line);

        const active = features.filter(f => {
            const g = tags(f).golf;
            return g === "tee" || g === "fairway" || g === "green";
        });

        const all = [];
        const collect = x => {
            if (!Array.isArray(x)) return;
            if (x.length >= 2 && typeof x[0] === "number") {
                all.push(x);
                return;
            }
            x.forEach(collect);
        };
        active.forEach(f => collect(f.geometry.coordinates));

        let cx = origin[0], cy = origin[1], scale = 1;

        if (all.length) {
            let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
            all.forEach(q => {
                x0=Math.min(x0,q[0]); x1=Math.max(x1,q[0]);
                y0=Math.min(y0,q[1]); y1=Math.max(y1,q[1]);
            });
            cx=(x0+x1)/2; cy=(y0+y1)/2;
            const cl=Math.cos(cy*Math.PI/180);
            const primary=portrait ? (y1-y0)*110540 : (x1-x0)*cl*111320;
            scale=(portrait ? 430 : 500)/Math.max(1,primary);
            scale=Math.max(.85,Math.min(2.25,scale));

            const scaleCoords = x => {
                if (!Array.isArray(x)) return x;
                if (x.length >= 2 && typeof x[0] === "number") {
                    return [cx+(x[0]-cx)*scale, cy+(x[1]-cy)*scale];
                }
                return x.map(scaleCoords);
            };
            const scaleFeature = f => {
                const q=JSON.parse(JSON.stringify(f));
                q.geometry.coordinates=scaleCoords(q.geometry.coordinates);
                return q;
            };
            features=features.map(scaleFeature);
            line=scaleFeature(line);
        }

        features.sort((a,b) => {
            const rank = g => g==="green" ? 100 : g==="bunker" ? 80 : g==="tee" ? 70 : g==="fairway" ? 40 : 20;
            return rank(tags(a).golf)-rank(tags(b).golf);
        });

        function project(coord) {
            const rotated=rotateCoord(coord);
            return [cx+(rotated[0]-cx)*scale, cy+(rotated[1]-cy)*scale];
        }

        return { features, line, project };
    }

    function ensureMap() {
        if (map) return;
        map = L.map(mapEl, {
            attributionControl:false,
            zoomControl:false,
            dragging:false,
            scrollWheelZoom:false,
            doubleClickZoom:false,
            boxZoom:false,
            keyboard:false,
            tap:false
        });
    }

    function showHole(n) {
        const h=boardData?.holes?.[String(n)];
        if (!h) return;
        ensureMap();

        const th=transformedHole(h);
        currentProject=th.project;

        if (holeLayer) map.removeLayer(holeLayer);
        holeLayer=L.geoJSON(
            {type:"FeatureCollection",features:th.features},
            {style:styleFeature,interactive:false}
        ).addTo(map);

        let zoomFeatures=th.features.filter(f => {
            const g=tags(f).golf;
            return g==="tee" || g==="fairway" || g==="green";
        });
        if (!zoomFeatures.length && th.line) zoomFeatures=[th.line];

        let bounds=L.geoJSON({type:"FeatureCollection",features:zoomFeatures}).getBounds();
        if (!bounds.isValid() && th.line) bounds=L.geoJSON(th.line).getBounds();
        if (bounds.isValid()) map.fitBounds(bounds,{padding:[8,12],maxZoom:20,animate:false});

        drawPlayer();
        if (statusEl) statusEl.textContent=`Väylä ${n} tunnistettu GPS:llä`;
        setTimeout(() => map.invalidateSize(false), 50);
    }

    function drawPlayer() {
        if (!map) return;
        if (playerMarker) {
            playerMarker.remove();
            playerMarker=null;
        }
        if (!lastPosition || !currentProject) return;
        const p=currentProject([lastPosition.lon,lastPosition.lat]);
        playerMarker=L.circleMarker([p[1],p[0]],{
            radius:7,
            color:"#111",
            weight:2,
            fillColor:"#fff",
            fillOpacity:1,
            interactive:false
        }).addTo(map);
    }

    function pointSegM(p,a,b) {
        const lat0=p[0]*Math.PI/180;
        const kx=111320*Math.cos(lat0);
        const ky=110540;
        const px=p[1]*kx, py=p[0]*ky;
        const ax=a[1]*kx, ay=a[0]*ky;
        const bx=b[1]*kx, by=b[0]*ky;
        const dx=bx-ax, dy=by-ay;
        const q=dx*dx+dy*dy;
        let t=q ? ((px-ax)*dx+(py-ay)*dy)/q : 0;
        t=Math.max(0,Math.min(1,t));
        return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
    }

    function pointDistToLine(latlon,line) {
        const c=longestLineCoords(line) || [];
        let best=Infinity;
        for (let i=1;i<c.length;i++) {
            best=Math.min(best,pointSegM(latlon,[c[i-1][1],c[i-1][0]],[c[i][1],c[i][0]]));
        }
        return best;
    }

    function nearestHole(lat,lon) {
        let best={n:null,d:Infinity};
        for (let n=1;n<=18;n++) {
            const line=boardData?.holes?.[String(n)]?.line;
            if (!line) continue;
            const d=pointDistToLine([lat,lon],line);
            if (d<best.d) best={n,d};
        }
        return best;
    }

    function evaluateFix(lat,lon,accuracy) {
        if (!boardData || !Number.isFinite(accuracy) || accuracy > GPS_FIX_LIMIT_METERS) {
            if (statusEl && panel.hidden === false) {
                statusEl.textContent=`Odotetaan tarkkaa GPS:ää (≤ ±${GPS_FIX_LIMIT_METERS} m)`;
            }
            return;
        }

        lastPosition={lat,lon,accuracy};
        const best=nearestHole(lat,lon);
        if (!best.n) return;

        if (currentHole) {
            const currentLine=boardData.holes[String(currentHole)]?.line;
            const currentDist=currentLine ? pointDistToLine([lat,lon],currentLine) : Infinity;

            if (best.n===currentHole) {
                candidateHole=null;
                candidateCount=0;
                drawPlayer();
                return;
            }

            const clearlyBetter =
                (best.d<=SWITCH_HOLE_MAX_METERS && best.d+15<currentDist) ||
                currentDist>85;

            if (!clearlyBetter) {
                drawPlayer();
                return;
            }
        } else if (best.d>FIRST_HOLE_MAX_METERS) {
            if (statusEl) statusEl.textContent=`GPS tarkka, mutta et ole ${COURSE_CONFIGS[activeCourseId]?.name || "valitun kentän"} väylällä · sohvatesti käytettävissä`;
            return;
        }

        if (candidateHole===best.n) candidateCount++;
        else {
            candidateHole=best.n;
            candidateCount=1;
        }

        if (statusEl) statusEl.textContent=`Väyläehdokas ${best.n} · ${candidateCount}/${CONFIRM_FIXES}`;

        if (candidateCount>=CONFIRM_FIXES) {
            currentHole=best.n;
            candidateHole=null;
            candidateCount=0;
            showHole(currentHole);
        }
    }

    function parseAccuracy(text) {
        const m=String(text||"").match(/([0-9]+(?:[.,][0-9]+)?)/);
        return m ? Number(m[1].replace(",",".")) : NaN;
    }

    function isGpsActive() {
        return gpsStatus && gpsStatus.textContent.trim() !== "Ei käytössä";
    }

    function resetMapState() {
        currentHole=null;
        candidateHole=null;
        candidateCount=0;
        lastPosition=null;
        currentProject=null;
        if (playerMarker) { playerMarker.remove(); playerMarker=null; }
        if (holeLayer && map) { map.removeLayer(holeLayer); holeLayer=null; }
        if (statusEl) statusEl.textContent="Odotetaan GPS-paikannusta";
    }

    async function loadBoardForCourse(courseId) {
        const config=COURSE_CONFIGS[courseId];
        if (!config) return null;
        if (boardCache.has(courseId)) return boardCache.get(courseId);
        if (boardLoads.has(courseId)) return boardLoads.get(courseId);

        const promise=fetch(config.boardUrl,{cache:"no-store"})
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(data => {
                boardCache.set(courseId,data);
                boardLoads.delete(courseId);
                return data;
            })
            .catch(error => {
                boardLoads.delete(courseId);
                throw error;
            });
        boardLoads.set(courseId,promise);
        return promise;
    }

    async function refreshFromScorecard() {
        const selectedCourseId=courseSelect?.value || "";
        const config=COURSE_CONFIGS[selectedCourseId];
        const active=isGpsActive();

        panel.hidden = !(config && active);
        if (panel.hidden) {
            if (!active || !config) {
                resetMapState();
                activeCourseId=null;
                boardData=null;
            }
            return;
        }

        if (selectedCourseId !== activeCourseId || !boardData) {
            resetMapState();
            activeCourseId=selectedCourseId;
            if (statusEl) statusEl.textContent=`Ladataan ${config.name} väyläkarttoja…`;
            try {
                boardData=await loadBoardForCourse(selectedCourseId);
                // Ignore a completed fetch if the user changed course meanwhile.
                if (courseSelect?.value !== selectedCourseId) return;
                if (statusEl) statusEl.textContent=`${config.name} väyläkartat valmiina`;
            } catch (error) {
                console.warn(`${config.name} väyläkarttojen lataus epäonnistui:`,error);
                if (statusEl) statusEl.textContent="Väyläkartan lataus epäonnistui";
                boardData=null;
                return;
            }
        }

        if (map) setTimeout(() => map.invalidateSize(false),50);

        const lat=Number(gpsLatitude?.textContent);
        const lon=Number(gpsLongitude?.textContent);
        const acc=parseAccuracy(gpsAccuracy?.textContent);

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            evaluateFix(lat,lon,acc);
        }
    }

    function runSofaTest() {
        if (!boardData || !testHoleSelect) return;
        const n=Number(testHoleSelect.value);
        const line=boardData?.holes?.[String(n)]?.line;
        const coords=longestLineCoords(line) || [];
        if (!coords.length) return;

        // Programmatic test location: one click, no real GPS and no 3-fix wait.
        const mid=coords[Math.floor(coords.length/2)];
        lastPosition={lat:mid[1],lon:mid[0],accuracy:3};
        currentHole=n;
        candidateHole=null;
        candidateCount=0;
        showHole(n);
        if (statusEl) statusEl.textContent=`Sohvatesti · väylä ${n} · ohjelmallinen sijainti ±3 m`;
    }

    async function init() {
        if (statusEl) statusEl.textContent="Väyläkartat valmiina";

        [gpsStatus,gpsAccuracy,gpsLatitude,gpsLongitude].forEach(el => {
            if (!el) return;
            new MutationObserver(refreshFromScorecard).observe(el,{childList:true,subtree:true,characterData:true});
        });

        courseSelect?.addEventListener("change",refreshFromScorecard);
        testButton?.addEventListener("click",runSofaTest);

        // Auto-course selection in the scorecard may set the select value without firing change.
        window.setInterval(refreshFromScorecard,1000);

        window.addEventListener("orientationchange",() => setTimeout(() => {
            if (currentHole) showHole(currentHole);
        },250));

        refreshFromScorecard();
    }

    init();
})();
