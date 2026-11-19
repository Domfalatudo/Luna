(() => {
  const canvas = document.getElementById("robot-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.insertAdjacentText("afterend", "Seu navegador não oferece suporte à visualização Canvas.");
    return;
  }
  let angle = -0.55;
  let zoom = 1;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  };
  const rotate = ([x, y, z]) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    return [x * c - z * s, y, x * s + z * c];
  };
  const project = (point, cx, cy, scale) => {
    const [x, y, z] = rotate(point);
    const perspective = 4.8 / (4.8 + z);
    return [cx + x * scale * perspective, cy - y * scale * perspective];
  };
  const draw = () => {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f7f7f6";
    ctx.fillRect(0, 0, width, height);
    const cx = width / 2, cy = height * .56;
    const scale = Math.min(width / 5.3, height / 3.7) * zoom;
    const cuboid = (center, size, fill) => {
      const [x, y, z] = center, [w, h, d] = size;
      const vertices = [[x-w/2,y-h/2,z-d/2],[x+w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z-d/2],[x-w/2,y+h/2,z-d/2],
        [x-w/2,y-h/2,z+d/2],[x+w/2,y-h/2,z+d/2],[x+w/2,y+h/2,z+d/2],[x-w/2,y+h/2,z+d/2]];
      const faces = [[0,1,2,3],[4,5,6,7],[0,1,5,4],[3,2,6,7],[1,2,6,5],[0,3,7,4]];
      const ordered = faces.map((face) => ({face, depth: face.reduce((sum, idx) => sum + rotate(vertices[idx])[2], 0) / 4})).sort((a,b) => a.depth - b.depth);
      ordered.forEach(({face}, i) => {
        ctx.beginPath();
        face.forEach((idx, n) => {
          const p = project(vertices[idx], cx, cy, scale);
          if (n === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
        });
        ctx.closePath();
        ctx.fillStyle = i === 0 ? "#e4e4e4" : fill;
        ctx.fill();
        ctx.strokeStyle = "#454545";
        ctx.lineWidth = 1.3;
        ctx.stroke();
      });
    };
    const wheel = (x, z) => {
      const center = project([x, -.37, z], cx, cy, scale);
      const edge = project([x + .3, -.37, z], cx, cy, scale);
      const radius = Math.max(5, Math.hypot(edge[0]-center[0], edge[1]-center[1]));
      ctx.beginPath();
      ctx.ellipse(center[0], center[1], radius, radius * .62, angle * .2, 0, Math.PI*2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = "#454545";
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    ctx.strokeStyle = "#e3e3e3";
    ctx.beginPath(); ctx.moveTo(24, cy + scale * .55); ctx.lineTo(width - 24, cy + scale * .55); ctx.stroke();
    wheel(-.82, .48); wheel(.82, .48); wheel(-.82, -.48); wheel(.82, -.48);
    cuboid([0, -.05, 0], [1.9, .55, 1.35], "#ededed");
    cuboid([0, .47, 0], [.55, .72, .54], "#fafafa");
    cuboid([0, .92, 0], [.74, .12, .72], "#e5e5e5");
    const sensor = project([0, .57, .31], cx, cy, scale);
    ctx.beginPath(); ctx.arc(sensor[0], sensor[1], 4, 0, Math.PI * 2); ctx.fillStyle = "#555"; ctx.fill();
  };
  const pointerDown = (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    angle += (event.clientX - lastX) * .012;
    lastX = event.clientX;
    lastY = event.clientY;
    draw();
  });
  canvas.addEventListener("pointerup", () => { dragging = false; });
  canvas.addEventListener("pointercancel", () => { dragging = false; });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoom = Math.min(1.5, Math.max(.7, zoom + (event.deltaY < 0 ? .05 : -.05)));
    document.getElementById("zoom-control").value = String(zoom);
    draw();
  }, {passive: false});
  document.getElementById("zoom-control").addEventListener("input", (event) => {
    zoom = Number(event.target.value);
    draw();
  });
  document.getElementById("reset-view").addEventListener("click", () => {
    angle = -.55;
    zoom = 1;
    document.getElementById("zoom-control").value = "1";
    draw();
  });
  window.addEventListener("resize", resize);
  resize();
})();
