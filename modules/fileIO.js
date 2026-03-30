// fileIO.js
// Handles New, Load, and Save. Exposes a single global: FileIO

const FileIO = (() => {

  function init({ onNew, onLoad, getCharacter, onSaved }) {

    document.getElementById('btn-new').addEventListener('click', () => {
      onNew();
    });

    document.getElementById('file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text      = await file.text();
        const character = JSON.parse(text);
        onLoad(character);
      } catch {
        alert('Could not read that file. Make sure it is a valid Metanoia character .json.');
      }
      e.target.value = '';
    });

    document.getElementById('btn-save').addEventListener('click', async () => {
      const saved = await saveToFile(getCharacter());
      if (saved) onSaved();
    });
  }

  async function saveToFile(character) {
    character.meta.lastSaved = new Date().toISOString();

    const json    = JSON.stringify(character, null, 2);
    const rawName = ((character.identity || {}).name || '').trim();
    const filename = rawName
      ? `${rawName.replace(/[^a-z0-9 _-]/gi, '').replace(/\s+/g, '_')}.json`
      : 'character.json';

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          id: 'metanoia-characters',
          suggestedName: filename,
          types: [{ description: 'Metanoia Character', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return true;
      } catch (err) {
        if (err.name === 'AbortError') return false;
        console.error('Save failed:', err);
        alert('Save failed. See the browser console for details.');
        return false;
      }
    }

    // Fallback: download
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  return { init };
})();
