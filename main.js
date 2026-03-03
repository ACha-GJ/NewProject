const STORAGE_KEY = "framepick-sprint2-state";
const ANALYSIS_ADVANCE_MS = 900;
const GROUP_WINDOW_MS = 15000;
const MAX_UPLOADS = 18;
const gradientPairs = [
  ["#cbd5e1", "#64748b"],
  ["#bfdbfe", "#1d4ed8"],
  ["#d9f99d", "#4d7c0f"],
  ["#fecdd3", "#be123c"],
  ["#fde68a", "#b45309"],
  ["#ddd6fe", "#6d28d9"],
  ["#a7f3d0", "#047857"],
  ["#fed7aa", "#c2410c"],
  ["#fbcfe8", "#be185d"],
];

const baseMockGroups = [
  {
    id: "g1",
    title: "Riverside Bridge",
    status: "unreviewed",
    reason: "Captured in one short burst. The recommended frame appears to keep the cleanest detail.",
    photos: [
      { id: "g1p1", label: "Bridge 01", accent: makeGradient("#cbd5e1", "#64748b"), sizeLabel: "4.1 MB", captureLabel: "09:42" },
      { id: "g1p2", label: "Bridge 02", accent: makeGradient("#bfdbfe", "#2563eb"), sizeLabel: "4.6 MB", captureLabel: "09:42" },
      { id: "g1p3", label: "Bridge 03", accent: makeGradient("#d9f99d", "#4d7c0f"), sizeLabel: "4.2 MB", captureLabel: "09:42" },
    ],
    recommendedIndex: 1,
  },
  {
    id: "g2",
    title: "Portrait Sequence",
    status: "unreviewed",
    reason: "Similar naming and timing suggest a portrait sequence. The suggested frame keeps the strongest file detail.",
    photos: [
      { id: "g2p1", label: "Portrait 01", accent: makeGradient("#fecdd3", "#be123c"), sizeLabel: "3.8 MB", captureLabel: "10:17" },
      { id: "g2p2", label: "Portrait 02", accent: makeGradient("#fde68a", "#b45309"), sizeLabel: "4.0 MB", captureLabel: "10:17" },
      { id: "g2p3", label: "Portrait 03", accent: makeGradient("#ddd6fe", "#6d28d9"), sizeLabel: "4.4 MB", captureLabel: "10:17" },
      { id: "g2p4", label: "Portrait 04", accent: makeGradient("#bfdbfe", "#1d4ed8"), sizeLabel: "3.9 MB", captureLabel: "10:18" },
    ],
    recommendedIndex: 2,
  },
  {
    id: "g3",
    title: "Street Walk Burst",
    status: "deferred",
    reason: "These frames are very close together, so the app keeps one suggestion ready while you compare the timing yourself.",
    photos: [
      { id: "g3p1", label: "Street 01", accent: makeGradient("#fed7aa", "#c2410c"), sizeLabel: "3.1 MB", captureLabel: "11:03" },
      { id: "g3p2", label: "Street 02", accent: makeGradient("#a7f3d0", "#047857"), sizeLabel: "3.0 MB", captureLabel: "11:03" },
      { id: "g3p3", label: "Street 03", accent: makeGradient("#fbcfe8", "#be185d"), sizeLabel: "2.9 MB", captureLabel: "11:03" },
    ],
    recommendedIndex: 0,
  },
];

const app = document.querySelector("#app");
let analysisTimer = null;

const state = restoreState();

function makeGradient(start, end) {
  return `linear-gradient(135deg, ${start}, ${end})`;
}

function cloneDefaultGroups() {
  return baseMockGroups.map((group) => ({
    ...group,
    photos: group.photos.map((photo) => ({ ...photo })),
  }));
}

function createDefaultState() {
  const groups = cloneDefaultGroups();
  return {
    screen: "home",
    uploadedFiles: [],
    groups,
    currentGroupId: groups[0].id,
    currentPhotoIndex: groups[0].recommendedIndex,
    selectedByGroup: {},
    feedback: null,
    analysisSummary: {
      source: "sample",
      photoCount: groups.reduce((total, group) => total + group.photos.length, 0),
      groupCount: groups.length,
      groupedBy: "sample scenes",
      note: "Built-in sample groups are loaded. Upload your own photos to test realistic grouping.",
    },
  };
}

function restoreState() {
  const defaults = createDefaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw);
    const groups = Array.isArray(parsed.groups) && parsed.groups.length ? parsed.groups : defaults.groups;
    const safeScreen =
      parsed.screen && ["home", "upload", "groups", "detail", "result"].includes(parsed.screen)
        ? parsed.screen
        : "home";
    const currentGroupId = groups.some((group) => group.id === parsed.currentGroupId)
      ? parsed.currentGroupId
      : groups[0].id;

    return {
      screen: safeScreen === "analysis" ? "groups" : safeScreen,
      uploadedFiles: Array.isArray(parsed.uploadedFiles) ? parsed.uploadedFiles : [],
      groups,
      currentGroupId,
      currentPhotoIndex: Number.isInteger(parsed.currentPhotoIndex) ? parsed.currentPhotoIndex : 0,
      selectedByGroup:
        parsed.selectedByGroup && typeof parsed.selectedByGroup === "object" ? parsed.selectedByGroup : {},
      feedback: null,
      analysisSummary:
        parsed.analysisSummary && typeof parsed.analysisSummary === "object"
          ? parsed.analysisSummary
          : defaults.analysisSummary,
    };
  } catch (error) {
    return defaults;
  }
}

function persistState() {
  const serializable = {
    screen: state.screen,
    uploadedFiles: state.uploadedFiles.map((file) => ({
      id: file.id,
      name: file.name,
      size: file.size,
      sizeLabel: file.sizeLabel,
      lastModified: file.lastModified,
      captureLabel: file.captureLabel,
      accent: file.accent,
      stem: file.stem,
    })),
    groups: state.groups.map((group) => ({
      id: group.id,
      title: group.title,
      status: group.status,
      reason: group.reason,
      recommendedIndex: group.recommendedIndex,
      photos: group.photos.map((photo) => ({
        id: photo.id,
        label: photo.label,
        accent: photo.accent,
        sizeLabel: photo.sizeLabel || "",
        captureLabel: photo.captureLabel || "",
      })),
    })),
    currentGroupId: state.currentGroupId,
    currentPhotoIndex: state.currentPhotoIndex,
    selectedByGroup: state.selectedByGroup,
    analysisSummary: state.analysisSummary,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    // Ignore storage failures. The app still works as an in-memory MVP.
  }
}

function clearAnalysisTimer() {
  if (analysisTimer) {
    window.clearTimeout(analysisTimer);
    analysisTimer = null;
  }
}

function sync() {
  persistState();
  render();
}

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

function formatFileSize(size) {
  if (!size) {
    return "Unknown size";
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

function formatCaptureLabel(timestamp) {
  if (!timestamp) {
    return "Unknown time";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function normalizeStem(name) {
  return name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[_-]?\d+$/, "")
    .replace(/\s+\d+$/, "")
    .trim();
}

function buildAccent(seed) {
  const index =
    Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % gradientPairs.length;
  const [start, end] = gradientPairs[index];
  return makeGradient(start, end);
}

function hydrateUploads(fileList) {
  const stamp = Date.now();
  return fileList
    .slice(0, MAX_UPLOADS)
    .sort((a, b) => a.lastModified - b.lastModified || a.name.localeCompare(b.name))
    .map((file, index) => ({
      id: `upload-file-${stamp}-${index}`,
      name: file.name,
      size: file.size,
      sizeLabel: formatFileSize(file.size),
      lastModified: file.lastModified,
      captureLabel: formatCaptureLabel(file.lastModified),
      previewUrl: URL.createObjectURL(file),
      accent: buildAccent(file.name),
      stem: normalizeStem(file.name),
    }));
}

function clonePhoto(photo) {
  return { ...photo };
}

function buildGroupTitle(batch, groupNumber) {
  const sharedStem = batch[0].stem;
  if (sharedStem) {
    const normalized = sharedStem.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    return normalized;
  }

  return `Capture Block ${groupNumber}`;
}

function buildGroupReason(batch, recommended, sharedStem, spanSeconds) {
  const reasons = [];

  if (sharedStem) {
    reasons.push("Similar file names suggest a near-duplicate burst.");
  }

  if (spanSeconds <= 3) {
    reasons.push("These frames were captured almost back-to-back.");
  } else if (spanSeconds <= 15) {
    reasons.push(`These frames were captured within ${spanSeconds} seconds of each other.`);
  }

  if (recommended.size === Math.max(...batch.map((item) => item.size))) {
    reasons.push("The suggested frame keeps the largest file footprint in this group.");
  }

  if (!reasons.length) {
    reasons.push("This set appears close enough to compare as a single review group.");
  }

  return reasons.join(" ");
}

function shouldJoinGroup(batch, candidate) {
  const first = batch[0];
  const last = batch[batch.length - 1];
  const shareStem = first.stem && first.stem === candidate.stem;
  const withinTime = Math.abs(candidate.lastModified - last.lastModified) <= GROUP_WINDOW_MS;
  const withinSizeBand =
    Math.min(first.size || 1, candidate.size || 1) / Math.max(first.size || 1, candidate.size || 1) > 0.45;

  if (shareStem && Math.abs(candidate.lastModified - first.lastModified) <= GROUP_WINDOW_MS * 4) {
    return true;
  }

  return withinTime && withinSizeBand && batch.length < 5;
}

function createGroupFromBatch(batch, groupNumber) {
  const recommendedIndex = batch.reduce(
    (bestIndex, item, index, items) => (item.size > items[bestIndex].size ? index : bestIndex),
    0
  );
  const sharedStem = batch.every((item) => item.stem === batch[0].stem) ? batch[0].stem : "";
  const spanSeconds = Math.max(
    0,
    Math.round((batch[batch.length - 1].lastModified - batch[0].lastModified) / 1000)
  );
  const recommended = batch[recommendedIndex];

  return {
    id: `upload-group-${groupNumber}`,
    title: buildGroupTitle(batch, groupNumber),
    status: "unreviewed",
    reason: buildGroupReason(batch, recommended, sharedStem, spanSeconds),
    recommendedIndex,
    photos: batch.map((item) => ({
      id: item.id,
      label: item.name,
      previewUrl: item.previewUrl,
      accent: item.accent,
      sizeLabel: item.sizeLabel,
      captureLabel: item.captureLabel,
    })),
  };
}

function buildGroupsFromFiles(files) {
  if (!files.length) {
    const groups = cloneDefaultGroups();
    return {
      groups,
      analysisSummary: {
        source: "sample",
        photoCount: groups.reduce((total, group) => total + group.photos.length, 0),
        groupCount: groups.length,
        groupedBy: "sample scenes",
        note: "Built-in sample groups are loaded. Upload your own photos to test realistic grouping.",
      },
    };
  }

  const batches = [];
  let currentBatch = [];

  files.forEach((file) => {
    if (!currentBatch.length) {
      currentBatch = [file];
      return;
    }

    if (shouldJoinGroup(currentBatch, file)) {
      currentBatch.push(file);
      return;
    }

    batches.push(currentBatch);
    currentBatch = [file];
  });

  if (currentBatch.length) {
    batches.push(currentBatch);
  }

  const groups = batches.map((batch, index) => createGroupFromBatch(batch, index + 1));

  return {
    groups,
    analysisSummary: {
      source: "upload",
      photoCount: files.length,
      groupCount: groups.length,
      groupedBy: "filename similarity + capture timing",
      note: "Groups are clustered by similar file names, nearby capture times, and roughly matching file size.",
    },
  };
}

function renderPhotoCard(photo, active) {
  const meta = [photo.captureLabel, photo.sizeLabel].filter(Boolean).join(" • ");
  if (photo.previewUrl) {
    return `
      <button class="thumb ${active ? "active" : ""}" data-action="view-photo" data-photo-id="${photo.id}">
        <img src="${photo.previewUrl}" alt="${escapeHtml(photo.label)}" />
        <span>${escapeHtml(photo.label)}</span>
        <small>${escapeHtml(meta || "Preview loaded")}</small>
      </button>
    `;
  }

  return `
    <button class="thumb ${active ? "active" : ""}" data-action="view-photo" data-photo-id="${photo.id}">
      <span class="thumb-placeholder" style="background-image: ${photo.accent};"></span>
      <span>${escapeHtml(photo.label)}</span>
      <small>${escapeHtml(meta || "Metadata restored")}</small>
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
    <div class="preview-frame placeholder-frame" style="background-image: ${photo.accent};">
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
  const sourceLabel = state.analysisSummary.source === "upload" ? "Your uploaded session" : "Sample session";

  return getAppShell(
    `
      <section class="hero card">
        <p class="eyebrow">Assistant, not autopilot</p>
        <h2>Compare similar shots faster, then make the final call yourself.</h2>
        <p class="muted">This MVP narrows a large photo set into realistic review groups using upload metadata, then keeps the final choice in your hands.</p>
        <div class="button-row">
          <button class="primary" data-action="go-upload">Start a Review</button>
          <button class="secondary" data-action="continue-work">Resume Current Session</button>
        </div>
      </section>
      <section class="card summary-card">
        <h3>Current Session</h3>
        <p>${escapeHtml(recentCopy)}</p>
        <p class="helper helper-detail">${escapeHtml(sourceLabel)}. ${escapeHtml(state.analysisSummary.note)}</p>
        <div class="metric-row">
          <div class="metric"><span>${state.groups.length}</span><small>Groups</small></div>
          <div class="metric"><span>${completed}</span><small>Selected</small></div>
          <div class="metric"><span>${state.uploadedFiles.length || state.analysisSummary.photoCount}</span><small>Photos tracked</small></div>
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
        .map(
          (file) => `
            <li>
              <span class="upload-name">${escapeHtml(file.name)}</span>
              <small class="upload-meta">${escapeHtml(`${file.captureLabel} • ${file.sizeLabel}`)}</small>
            </li>
          `
        )
        .join("")
    : "<li>No files selected yet.</li>";

  const actionLabel = state.uploadedFiles.length ? "Group These Photos" : "Try the Sample Set";
  const helperCopy = state.uploadedFiles.length
    ? `${state.uploadedFiles.length} files are ready. The review groups will be built from file names, timing, and file size.`
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
          <p class="helper">Selected files: <strong>${state.uploadedFiles.length}</strong> / ${MAX_UPLOADS}</p>
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
        <p class="muted">The current build uses file naming, capture timing, and file size to create a more realistic first-pass grouping.</p>
        <div class="progress-track">
          <div class="progress-fill"></div>
        </div>
        <p class="helper helper-detail">This screen advances automatically after a short pause, or you can continue immediately.</p>
        <div class="analysis-grid">
          <div class="metric"><span>${state.analysisSummary.photoCount}</span><small>Photos in queue</small></div>
          <div class="metric"><span>${state.analysisSummary.groupCount}</span><small>Preview groups</small></div>
          <div class="metric"><span>Hybrid</span><small>Grouping mode</small></div>
        </div>
        <p class="helper helper-detail">${escapeHtml(`Grouping basis: ${state.analysisSummary.groupedBy}. ${state.analysisSummary.note}`)}</p>
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
          <div class="group-visual" style="background-image: ${recommended.accent || makeGradient("#d1d5db", "#6b7280")};">
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
        <p class="eyebrow">Step 3</p>
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
  const meta = [photo.captureLabel, photo.sizeLabel].filter(Boolean).join(" • ");
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
          <p class="eyebrow">Step 4</p>
          <div class="detail-topline">
            <h2>${escapeHtml(group.title)}</h2>
            <span class="status ${state.selectedByGroup[group.id] ? "selected" : group.status}">${getStatusLabel(state.selectedByGroup[group.id] ? "selected" : group.status)}</span>
          </div>
          <p class="muted">Group ${groupIndex + 1} of ${state.groups.length}. Compare the suggestions, then commit the choice yourself.</p>
          <p class="helper helper-detail">${escapeHtml(meta || "No photo metadata available for this frame.")}</p>
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
          <div class="result-visual" style="background-image: ${photo.accent || makeGradient("#d1d5db", "#6b7280")};">
            ${
              photo.previewUrl
                ? `<img src="${photo.previewUrl}" alt="${escapeHtml(photo.label)}" />`
                : `<span>${escapeHtml(photo.label)}</span>`
            }
          </div>
          <div>
            <h3>${escapeHtml(group.title)}</h3>
            <p class="muted">Chosen frame: ${escapeHtml(photo.label)}</p>
            <p class="helper helper-detail">${escapeHtml([photo.captureLabel, photo.sizeLabel].filter(Boolean).join(" • ") || "Saved from current review session.")}</p>
          </div>
        </article>
      `;
    })
    .join("");

  const fallback = selectedEntries
    ? selectedEntries
    : '<section class="card empty-card"><h3>No frames selected yet</h3><p class="muted">Review at least one group to validate the selection flow.</p></section>';

  return getAppShell(
    `
      <section class="card summary-card">
        <p class="eyebrow">Step 5</p>
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
      <section class="stack">${fallback}</section>
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

function setScreen(screen) {
  clearAnalysisTimer();
  state.screen = screen;
  sync();
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.id !== "file-input") {
    return;
  }

  state.uploadedFiles = hydrateUploads(Array.from(target.files || []));
  state.feedback = null;
  sync();
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
    const result = buildGroupsFromFiles(state.uploadedFiles);
    state.groups = result.groups;
    state.analysisSummary = result.analysisSummary;
    state.currentGroupId = state.groups[0].id;
    state.currentPhotoIndex = state.groups[0].recommendedIndex;
    state.feedback = null;
    state.selectedByGroup = {};
    state.screen = "analysis";
    sync();
    analysisTimer = window.setTimeout(() => {
      if (state.screen === "analysis") {
        setScreen("groups");
      }
    }, ANALYSIS_ADVANCE_MS);
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
    sync();
    return;
  }

  if (action === "view-photo") {
    const group = getCurrentGroup();
    const index = group.photos.findIndex((photo) => photo.id === target.dataset.photoId);
    if (index >= 0) {
      state.currentPhotoIndex = index;
      sync();
    }
    return;
  }

  if (action === "next-photo") {
    const group = getCurrentGroup();
    state.currentPhotoIndex = (state.currentPhotoIndex + 1) % group.photos.length;
    sync();
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
    sync();
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
    const defaults = createDefaultState();
    Object.assign(state, defaults);
    sync();
  }
});

render();
