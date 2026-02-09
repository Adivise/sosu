/**
 * Generate HTML for installed theme card
 */
export function renderInstalledCard(themeName, metadata, baseUrl) {
  const authorLink = metadata.authorLinks 
    ? `<a href="${metadata.authorLinks}" target="_blank" rel="noopener">${metadata.author}</a>` 
    : metadata.author;
  
  const deleteButton = themeName !== 'default' 
    ? `<button class="btn danger" onclick="deleteTheme('${themeName}')">Delete</button>` 
    : '';

  // Split resolution into width and height
  const [width, height] = (metadata.resolution || 'x').split('x');

  return `
    <div class="card installed" data-theme="${themeName}" data-version="${metadata.version}">
      <div class="card-head">
        <div class="title">${metadata.name} <span class="badge">Installed</span></div>
        <div class="actions">
          <button class="btn" onclick="openFolder('${themeName}')">Open Folder</button>
          <button class="btn primary" id="update-${themeName}" onclick="updateTheme('${themeName}', this)" style="display:none;">Update</button>
          ${deleteButton}
        </div>
      </div>
      <div class="preview">
        <iframe src="/widget?theme=${themeName}" frameborder="0"></iframe>
      </div>
      <div class="meta">
        <span class="url copyable" onclick="copyText('${baseUrl}/widget?theme=${themeName}', this, 'URL')" title="Click to copy URL" role="button" tabindex="0" aria-label="Copy URL">URL: ${baseUrl}/widget?theme=${themeName}</span>
        <span class="copyable" onclick="copyText('${width}', this, 'Width')" title="Click to copy width" role="button" tabindex="0" aria-label="Copy Width">Width: ${width}</span>
        <span class="copyable" onclick="copyText('${height}', this, 'Height')" title="Click to copy height" role="button" tabindex="0" aria-label="Copy Height">Height: ${height}</span>
        <span class="ver">Version: ${metadata.version}</span>
        <span class="author">Author: ${authorLink}</span>
      </div>
    </div>
  `;
}
