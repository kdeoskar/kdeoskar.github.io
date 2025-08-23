const container = document.getElementById("window-container");

// spawn offset helper
function getSpawnPosition(icon) {
  if (!icon) return { dx: 0, dy: 0 }; // default (for photo link)
  const rect = icon.getBoundingClientRect();
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const iconCenterX = rect.left + rect.width / 2;
  const iconCenterY = rect.top + rect.height / 2;

  const offset = 60;
  const dx = iconCenterX < centerX ? -offset : offset;
  const dy = iconCenterY < centerY ? -offset : offset;

  return { dx, dy };
}

// Make a window draggable (mouse + touch via Pointer Events)
function makeDraggable(win) {
  const handle = win.querySelector(".title-bar"); // drag from title bar (better UX on touch)
  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  function onPointerDown(e) {
    // ignore clicks on close button
    if (e.target.closest(".close-btn")) return;

    // Only start dragging if started on the title bar
    if (!e.target.closest(".title-bar")) return;

    isDragging = true;
    const rect = win.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    // bring to front
    win.style.zIndex = String(Date.now());

    // capture pointer so moves keep firing even if the pointer leaves the element
    try { win.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    win.style.left = (e.clientX - offsetX) + "px";
    win.style.top = (e.clientY - offsetY) + "px";
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    try { win.releasePointerCapture(e.pointerId); } catch (_) {}
  }

  // Attach on the window so we keep receiving move/up while captured
  win.addEventListener("pointerdown", onPointerDown);
  win.addEventListener("pointermove", onPointerMove);
  win.addEventListener("pointerup", onPointerUp);
}

// function to create a new window
async function createWindow({ title, page, icon = null, isImage = false }) {
  const win = document.createElement("div");
  win.className = "window";
  win.innerHTML = `
    <div class="title-bar">
      <span>${title}</span>
      <button class="close-btn">[X]</button>
    </div>
    <div class="window-content">Loading...</div>
  `;

  container.appendChild(win);

  // Load content
  const contentDiv = win.querySelector(".window-content");
  if (isImage) {
    contentDiv.innerHTML = `
      <img src="${page}" alt="${title}" 
           style="max-width:100%; height:auto; display:block; margin:auto;">
    `;
  } else {
    try {
      const response = await fetch(`pages/${page}`);
      const content = await response.text();
      contentDiv.innerHTML = content;
    } catch {
      contentDiv.innerHTML = `<p>Could not load ${page}</p>`;
    }
  }

  // Position with offset relative to the main center
  const { dx, dy } = getSpawnPosition(icon);
  win.style.left = `calc(50% + ${dx}px)`;
  win.style.top  = `calc(50% + ${dy}px)`;

  // Close button
  win.querySelector(".close-btn").addEventListener("click", () => {
    win.remove();
  });

  // Draggable (mouse + touch)
  makeDraggable(win);
}

// attach to icons
document.querySelectorAll(".icon").forEach(icon => {
  icon.addEventListener("click", () => {
    const page = icon.dataset.page;
    const label = icon.querySelector("p") ? icon.querySelector("p").innerText : page;
    createWindow({ title: label, page, icon });
  });
});

// attach to photo link
const photoLink = document.getElementById("photo-link");
if (photoLink) {
  photoLink.addEventListener("click", (e) => {
    e.preventDefault();
    createWindow({
      title: "Hangin' with the Dolphins",
      page: "assets/me.JPG",  // <-- put your photo in assets/
      isImage: true
    });
  });
}
