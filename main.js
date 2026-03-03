const mockGroups = [
  {
    id: "g1",
    title: "Riverside Bridge",
    status: "unreviewed",
    reason: "Sharper details and steadier framing",
    photos: [
      { id: "g1p1", label: "Bridge 01", accent: "from #cbd5e1 to #64748b" },
      { id: "g1p2", label: "Bridge 02", accent: "from #bfdbfe to #2563eb" },
      { id: "g1p3", label: "Bridge 03", accent: "from #d9f99d to #4d7c0f" },
    ],
    recommendedIndex: 1,
  },
  {
    id: "g2",
    title: "Portrait Sequence",
    status: "unreviewed",
    reason: "Eyes are open and facial detail reads cleaner",
    photos: [
      { id: "g2p1", label: "Portrait 01", accent: "from #fecdd3 to #be123c" },
      { id: "g2p2", label: "Portrait 02", accent: "from #fde68a to #b45309" },
      { id: "g2p3", label: "Portrait 03", accent: "from #ddd6fe to #6d28d9" },
      { id: "g2p4", label: "Portrait 04", accent: "from #bfdbfe to #1d4ed8" },
    ],
    recommendedIndex: 2,
  },
  {
    id: "g3",
    title: "Street Walk Burst",
    status: "deferred",
    reason: "Very close set, but this frame feels the most balanced",
    photos: [
      { id: "g3p1", label: "Street 01", accent: "from #fed7aa to #c2410c" },
      { id: "g3p2", label: "Street 02", accent: "from #a7f3d0 to #047857" },
      { id: "g3p3", label: "Street 03", accent: "from #fbcfe8 to #be185d" },
    ],
    recommendedIndex: 0,
  },
];

const state = {
  screen: "home",
  uploadedFiles: [],
  groups: mockGroups,
  currentGroupId: mockGroups[0].id,
  currentPhotoIndex: mockGroups[0].recommendedIndex,
  selectedByGroup: {},
  feedback: null,
};

const app = document.querySelector("#app");

function getCurrentGroup() {
  return state.groups.find((group) => group.id === state.currentGroupId) || state.groups[0];
}

function getStatusLabel(status) {
  if (status === "selected") return "Complete";
  if (status === "deferred") return "Deferred";
  return "Unreviewed";
}

function getCurrentGroupIndex() {
  return Math.max(
    0,
    state.groups.findIndex((group) => group.id === state.currentGroupId)
  );
}

function getNextUnselectedGroupId() {
  const nextGroup = state.groups.find((group) => !state.selectedByGroup[group.id]);
  return nextGroup ? nextGroup.id : null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPhotoCard(photo, active) {
  if (photo.previewUrl) {
    return `
      <button class="thumb ${active ? "active" : ""}" data-action="view-photo" data-photo-id="${photo.id}">
        <img src="${photo.previewUrl}" alt="${escapeHtml(photo.label)}" />
        <span>${escapeHtml(photo.label)}</span>
      </button>
    `;
  }

  return `
    <button class="thumb ${active ? "active" : ""}" data-action="view-photo" data-photo-id="${photo.id}">
      <span class="thumb-placeholder" style="background-image: linear-gradient(135deg, ${photo.accent});"></span>
      <span>${escapeHtml(photo.label)}</span>
    </button>
  `;
}

function renderMainPreview(photo) {
  if (photo.previewUrl) {
    return `
      <div class="preview-frame photo-frame">
        <img src="${photo.previewUrl}" alt="${escapeHtml(photo.label)}" />
      </div>
    `;
  }

  return `
    <div class="preview-frame placeholder-frame" style="background-image: linear-gradient(135deg, ${photo.accent});">
      <span>${escapeHtml(photo.label)}</span>
    </div>
  `;
}

function getAppShell(content, subtitle) {
  return `
    <div class="shell">
      <header class="app-header">
        <div>
          <p class="eyebrow">FramePick MVP</p>
          <h1>Selection confidence for near-duplicate photos</h1>
        </div>
        <p class="header-note">${escapeHtml(subtitle)}</p>
      </header>
      ${content}
    </div>
  `;
}

function renderHome() {
  const completed = Object.keys(state.selectedByGroup).length;
  const recentCopy = completed
    ? `${completed} groups already reviewed in this session. You can reopen any group and revise your picks.`
    : "No saved progress yet. Start with a photo set and test how the review flow feels.";

  return getAppShell(
    `
      <section class="hero card">
        <p class="eyebrow">Assistant, not autopilot</p>
        <h2>Compare similar shots faster, then make the final call yourself.</h2>
        <p class="muted">This MVP is built around one promise: the app narrows the review, but the final choice still feels like yours.</p>
        <div class="button-row">
          <button class="primary" data-action="go-upload">Start a Review</button>
          <button class="secondary" data-action="continue-work">Resume Current Session</button>
        </div>
      </section>
      <section class="card summary-card">
        <h3>Current Session</h3>
        <p>${escapeHtml(recentCopy)}</p>
        <div class="metric-row">
          <div class="metric"><span>${state.groups.length}</span><small>Groups</small></div>
          <div class="metric"><span>${completed}</span><small>Selected</small></div>
          <div class="metric"><span>${state.uploadedFiles.length}</span><small>Uploaded</small></div>
        </div>
      </section>
    `,
    "Home"
  );
}

function renderUpload() {
  const names = state.uploadedFiles.length
    ? state.uploadedFiles
        .slice(0, 6)
        .map((file) => `<li>${escapeHtml(file.name)}</li>`)
        .join("")
    : "<li>No files selected yet.</li>";

  const actionLabel = state.uploadedFiles.length ? "Group These Photos" : "Try the Sample Set";
  const helperCopy = state.uploadedFiles.length
    ? "The review will start with your uploaded files."
    : "No files selected yet. You can still test the experience with the built-in sample groups.";

  return getAppShell(
    `
      <section class="card split-panel">
        <div>
          <p class="eyebrow">Step 1</p>
          <h2>Upload a burst or a travel batch</h2>
          <p class="muted">Use your own files to test a real review, or use the sample set if you only want to validate the flow first.</p>
          <label class="upload-zone" for="file-input">
            <input id="file-input" type="file" accept="image/*" multiple />
            <span>Drop photos here or click to choose files</span>
          </label>
          <p class="helper">Selected files: <strong>${state.uploadedFiles.length}</strong></p>
          <p class="helper helper-detail">${escapeHtml(helperCopy)}</p>
          <div class="button-row">
            <button class="primary" data-action="start-analysis">${actionLabel}</button>
            <button class="secondary" data-action="go-home">Back to Home</button>
          </div>
        </div>
        <div class="card inset-card">
          <h3>Queued Files</h3>
          <ul class="upload-list">${names}</ul>
        </div>
      </section>
    `,
    "Upload"
  );
}

function renderAnalysis() {
  return getAppShell(
    `
      <section class="card analysis-card">
        <p class="eyebrow">Step 2</p>
        <h2>Preparing comparison groups</h2>
        <p class="muted">The MVP clusters similar frames, highlights a suggested starting point, and hands the decision back to you.</p>
        <div class="progress-track">
          <div class="progress-fill"></div>
        </div>
        <p class="helper helper-detail">This screen advances automatically after a short pause, or you can continue immediately.</p>
        <div class="analysis-grid">
          <div class="metric"><span>${state.uploadedFiles.length || 10}</span><small>Photos in queue</small></div>
          <div class="metric"><span>${state.groups.length}</span><small>Preview groups</small></div>
          <div class="metric"><span>1</span><small>Suggested starter per group</small></div>
        </div>
        <button class="primary" data-action="finish-analysis">Open Review Groups</button>
      </section>
    `,
    "Analysis"
  );
}

function renderGroups() {
  const selectedCount = Object.keys(state.selectedByGroup).length;
  const allReviewed = selectedCount === state.groups.length;
  const summaryCopy = allReviewed
    ? "Every group already has a selected frame. You can reopen any group and refine the decision."
    : `${state.groups.length - selectedCount} groups still need a final pick.`;
  const cards = state.groups
    .map((group) => {
      const recommended = group.photos[group.recommendedIndex];
      const selectedPhotoId = state.selectedByGroup[group.id];
      const effectiveStatus = selectedPhotoId ? "selected" : group.status;
      const chosenPhoto = selectedPhotoId
        ? group.photos.find((photo) => photo.id === selectedPhotoId)
        : null;
      return `
        <article class="card group-card">
          <div class="group-visual" style="background-image: linear-gradient(135deg, ${recommended.accent || "from #d1d5db to #6b7280"});">
            ${
              recommended.previewUrl
                ? `<img src="${recommended.previewUrl}" alt="${escapeHtml(recommended.label)}" />`
                : `<span>${escapeHtml(recommended.label)}</span>`
            }
          </div>
          <div class="group-copy">
            <div class="group-topline">
              <h3>${escapeHtml(group.title)}</h3>
              <span class="status ${effectiveStatus}">${getStatusLabel(effectiveStatus)}</span>
            </div>
            <p class="muted">${group.photos.length} similar frames</p>
            <p class="reason">Start with: ${escapeHtml(group.reason)}</p>
            ${
              chosenPhoto
                ? `<p class="selection-note">Your current pick: <strong>${escapeHtml(chosenPhoto.label)}</strong></p>`
                : ""
            }
            <div class="button-row">
              <button class="primary" data-action="open-group" data-group-id="${group.id}">Review Group</button>
              <button class="ghost" data-action="mark-deferred" data-group-id="${group.id}">Defer</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  return getAppShell(
    `
      <section class="card group-summary">
        <p class="eyebrow">Step 2</p>
        <h2>${allReviewed ? "Every group has a chosen frame" : "Review one group at a time"}</h2>
        <p class="muted">${
          allReviewed
            ? "Every group has a selected frame. You can reopen any group and change your decision."
            : "Each group starts with a suggestion, but the final decision stays with you."
        }</p>
        <p class="helper helper-detail">${escapeHtml(summaryCopy)}</p>
        <div class="metric-row">
          <div class="metric"><span>${state.groups.length}</span><small>Total groups</small></div>
          <div class="metric"><span>${selectedCount}</span><small>Chosen</small></div>
          <div class="metric"><span>${state.groups.length - selectedCount}</span><small>Remaining</small></div>
        </div>
        <div class="button-row">
          <button class="secondary" data-action="go-upload">Add More Photos</button>
          <button class="primary" data-action="go-result">Review Current Picks</button>
        </div>
      </section>
      <section class="stack">${cards}</section>
    `,
    "Group Review"
  );
}

function renderDetail() {
  const group = getCurrentGroup();
  const photo = group.photos[state.currentPhotoIndex] || group.photos[0];
  const groupIndex = getCurrentGroupIndex();
  const hasSelection = Boolean(state.selectedByGroup[group.id]);
  const currentPick = hasSelection
    ? group.photos.find((item) => item.id === state.selectedByGroup[group.id])
    : null;
  const feedback =
    state.feedback && state.feedback.groupId === group.id
      ? `
          <section class="feedback-panel">
            <p class="eyebrow">Selection confirmed</p>
            <h3>You chose ${escapeHtml(state.feedback.photoLabel)}</h3>
            <p class="muted">${escapeHtml(state.feedback.message)}</p>
            <div class="button-row compact-row">
              <button class="primary" data-action="next-group">Move to Next Group</button>
              <button class="secondary" data-action="go-result">Review Current Picks</button>
            </div>
          </section>
        `
      : "";
  const thumbs = group.photos
    .map((item, index) => renderPhotoCard(item, index === state.currentPhotoIndex))
    .join("");

  return getAppShell(
    `
      <section class="detail-grid">
        <div class="card preview-card">
          <p class="eyebrow">Step 3</p>
          <div class="detail-topline">
            <h2>${escapeHtml(group.title)}</h2>
            <span class="status ${state.selectedByGroup[group.id] ? "selected" : group.status}">${getStatusLabel(state.selectedByGroup[group.id] ? "selected" : group.status)}</span>
          </div>
          <p class="muted">Group ${groupIndex + 1} of ${state.groups.length}. Compare the suggestions, then commit the choice yourself.</p>
          ${renderMainPreview(photo)}
          <div class="thumb-strip">${thumbs}</div>
        </div>
        <aside class="card recommendation-card">
          <p class="eyebrow">Suggested place to start</p>
          <h3>${escapeHtml(photo.label)}</h3>
          <p class="reason">${escapeHtml(group.reason)}</p>
          <p class="muted">The app points you toward a likely winner first. You still decide which frame earns the final pick.</p>
          ${
            currentPick
              ? `<p class="selection-note">Current saved pick for this group: <strong>${escapeHtml(currentPick.label)}</strong></p>`
              : `<p class="selection-note">No final pick saved for this group yet.</p>`
          }
          ${feedback}
          <div class="button-column">
            <button class="primary" data-action="select-current">${hasSelection ? "Make This the Pick" : "Choose This Frame"}</button>
            <button class="secondary" data-action="next-photo">Compare Another Frame</button>
            <button class="secondary" data-action="next-group">Leave This Group for Now</button>
            <button class="ghost" data-action="back-to-groups">Back to Group List</button>
          </div>
        </aside>
      </section>
    `,
    "Compare and Choose"
  );
}

function renderResult() {
  const selectedCount = Object.keys(state.selectedByGroup).length;
  const remainingCount = Math.max(0, state.groups.length - selectedCount);
  const selectedEntries = state.groups
    .filter((group) => state.selectedByGroup[group.id])
    .map((group) => {
      const photo = group.photos.find((item) => item.id === state.selectedByGroup[group.id]);
      return `
        <article class="card result-card">
          <div class="result-visual" style="background-image: linear-gradient(135deg, ${photo.accent || "from #d1d5db to #6b7280"});">
            ${
              photo.previewUrl
                ? `<img src="${photo.previewUrl}" alt="${escapeHtml(photo.label)}" />`
                : `<span>${escapeHtml(photo.label)}</span>`
            }
          </div>
          <div>
            <h3>${escapeHtml(group.title)}</h3>
            <p class="muted">Chosen frame: ${escapeHtml(photo.label)}</p>
          </div>
        </article>
      `;
    })
    .join("");

  const feedback = selectedEntries
    ? selectedEntries
    : '<section class="card"><h3>No frames selected yet</h3><p class="muted">Review at least one group to validate the selection flow.</p></section>';

  return getAppShell(
    `
      <section class="card summary-card">
        <p class="eyebrow">Step 4</p>
        <h2>Your current picks</h2>
        <p class="muted">This screen shows the frames you selected. Reopen any group if you want to compare again or change a choice.</p>
        <p class="helper helper-detail">${
          remainingCount
            ? `${remainingCount} groups still do not have a final pick.`
            : "Every group has a saved pick right now."
        }</p>
        <div class="metric-row">
          <div class="metric"><span>${selectedCount}</span><small>Frames chosen</small></div>
          <div class="metric"><span>${state.groups.length}</span><small>Groups reviewed</small></div>
          <div class="metric"><span>${remainingCount}</span><small>Still open</small></div>
        </div>
        <div class="button-row">
          <button class="primary" data-action="restart">Start a New Review</button>
          <button class="secondary" data-action="back-to-groups">Back to Group List</button>
        </div>
      </section>
      <section class="stack">${feedback}</section>
    `,
    "Results"
  );
}

function render() {
  if (state.screen === "upload") {
    app.innerHTML = renderUpload();
    return;
  }
  if (state.screen === "analysis") {
    app.innerHTML = renderAnalysis();
    return;
  }
  if (state.screen === "groups") {
    app.innerHTML = renderGroups();
    return;
  }
  if (state.screen === "detail") {
    app.innerHTML = renderDetail();
    return;
  }
  if (state.screen === "result") {
    app.innerHTML = renderResult();
    return;
  }

  app.innerHTML = renderHome();
}

function buildGroupsFromFiles(files) {
  if (!files.length) {
    return mockGroups.map((group) => ({
      ...group,
      photos: group.photos.map((photo) => ({ ...photo })),
    }));
  }

  const chunkSize = 3;
  const groups = [];
  for (let index = 0; index < files.length; index += chunkSize) {
    const batch = files.slice(index, index + chunkSize);
    const photos = batch.map((file, offset) => ({
      id: `upload-${index + offset}`,
      label: file.name,
      previewUrl: file.previewUrl,
      accent: "from #e2e8f0 to #475569",
    }));
    groups.push({
      id: `upload-group-${groups.length + 1}`,
      title: `Upload Group ${groups.length + 1}`,
      status: "unreviewed",
      reason: batch.length > 1 ? "Closest frames grouped for a quick manual pass" : "Single frame added as a standalone review item",
      photos,
      recommendedIndex: 0,
    });
  }
  return groups;
}

function setScreen(screen) {
  state.screen = screen;
  render();
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.id !== "file-input") {
    return;
  }

  const files = Array.from(target.files || []).slice(0, 18);
  state.uploadedFiles = files.map((file) => ({
    name: file.name,
    previewUrl: URL.createObjectURL(file),
  }));
  render();
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const action = target.dataset.action;

  if (action === "go-upload") {
    setScreen("upload");
    return;
  }

  if (action === "go-home") {
    setScreen("home");
    return;
  }

  if (action === "continue-work") {
    state.feedback = null;
    setScreen("groups");
    return;
  }

  if (action === "start-analysis") {
    state.groups = buildGroupsFromFiles(state.uploadedFiles);
    state.currentGroupId = state.groups[0].id;
    state.currentPhotoIndex = state.groups[0].recommendedIndex;
    state.feedback = null;
    setScreen("analysis");
    window.setTimeout(() => {
      if (state.screen === "analysis") {
        setScreen("groups");
      }
    }, 900);
    return;
  }

  if (action === "finish-analysis") {
    setScreen("groups");
    return;
  }

  if (action === "open-group") {
    const { groupId } = target.dataset;
    const group = state.groups.find((item) => item.id === groupId);
    if (!group) {
      return;
    }
    state.currentGroupId = group.id;
    state.currentPhotoIndex = group.recommendedIndex;
    state.feedback = null;
    setScreen("detail");
    return;
  }

  if (action === "mark-deferred") {
    const { groupId } = target.dataset;
    state.groups = state.groups.map((group) =>
      group.id === groupId ? { ...group, status: "deferred" } : group
    );
    render();
    return;
  }

  if (action === "view-photo") {
    const group = getCurrentGroup();
    const index = group.photos.findIndex((photo) => photo.id === target.dataset.photoId);
    if (index >= 0) {
      state.currentPhotoIndex = index;
      render();
    }
    return;
  }

  if (action === "next-photo") {
    const group = getCurrentGroup();
    state.currentPhotoIndex = (state.currentPhotoIndex + 1) % group.photos.length;
    render();
    return;
  }

  if (action === "select-current") {
    const group = getCurrentGroup();
    const photo = group.photos[state.currentPhotoIndex];
    state.selectedByGroup[group.id] = photo.id;
    state.groups = state.groups.map((item) =>
      item.id === group.id ? { ...item, status: "selected" } : item
    );
    state.feedback = {
      groupId: group.id,
      photoLabel: photo.label,
      message: `${photo.label} is now your chosen frame for this group. Move on, review your current picks, or change the decision before you finish.`,
    };
    render();
    return;
  }

  if (action === "go-result") {
    state.feedback = null;
    setScreen("result");
    return;
  }

  if (action === "back-to-groups") {
    state.feedback = null;
    setScreen("groups");
    return;
  }

  if (action === "next-group") {
    const currentIndex = getCurrentGroupIndex();
    const nextGroup = state.groups.find(
      (group, index) => index > currentIndex && !state.selectedByGroup[group.id]
    );
    const fallbackGroupId = getNextUnselectedGroupId();
    if (nextGroup || fallbackGroupId) {
      const nextId = nextGroup ? nextGroup.id : fallbackGroupId;
      const next = state.groups.find((group) => group.id === nextId);
      state.currentGroupId = next.id;
      state.currentPhotoIndex = next.recommendedIndex;
      state.feedback = null;
      setScreen("detail");
      return;
    }
    state.feedback = null;
    setScreen("result");
    return;
  }

  if (action === "restart") {
    state.uploadedFiles = [];
    state.groups = mockGroups.map((group) => ({
      ...group,
      status: group.id === "g3" ? "deferred" : "unreviewed",
      photos: group.photos.map((photo) => ({ ...photo })),
    }));
    state.currentGroupId = state.groups[0].id;
    state.currentPhotoIndex = state.groups[0].recommendedIndex;
    state.selectedByGroup = {};
    state.feedback = null;
    setScreen("home");
  }
});

render();
