const container = document.getElementById("window-container");

// spawn offset helper
function getSpawnPosition(icon) {
  if (!icon) return { dx: 0, dy: 0 }; // default (for photo link)
  const rect = icon.getBoundingClientRect();
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const iconCenterX = rect.left + rect.width / 2;
  const iconCenterY = rect.top + rect.height / 2;

  let dx = 0, dy = 0;
  const offset = 60;

  dx = iconCenterX < centerX ? -offset : offset;
  dy = iconCenterY < centerY ? -offset : offset;

  return { dx, dy };
}

// make a draggable window
function makeDraggable(win) {
  let isDragging = false;
  let offsetX, offsetY;

  win.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("close-btn")) return;

    isDragging = true;
    win.classList.add("dragging");

    const rect = win.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    // bring to front
    win.style.zIndex = Date.now();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    win.style.left = (e.clientX - offsetX) + "px";
    win.style.top = (e.clientY - offsetY) + "px";
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      win.classList.remove("dragging");
    }
  });
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

  // Position with offset
  const { dx, dy } = getSpawnPosition(icon);
  win.style.left = `calc(50% + ${dx}px)`;
  win.style.top = `calc(50% + ${dy}px)`;

  // Close button
  win.querySelector(".close-btn").addEventListener("click", () => {
    win.remove();
  });

  // Draggable
  makeDraggable(win);
}

// attach to icons
document.querySelectorAll(".icon").forEach(icon => {
  icon.addEventListener("click", () => {
    const page = icon.dataset.page;
    const label = icon.querySelector("p").innerText;
    createWindow({ title: label, page, icon });
  });
});

// attach to photo link
document.getElementById("photo-link").addEventListener("click", (e) => {
  e.preventDefault();
  createWindow({
    title: "Hangin' w the Dolphins",
    page: "assets/me.jpg",  // <-- put your photo in assets/
    isImage: true
  });
});
