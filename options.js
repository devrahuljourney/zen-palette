const envs = document.getElementById('envs');
const status = document.getElementById('status');

const flash = (msg) => {
  status.textContent = msg;
  setTimeout(() => (status.textContent = ''), 2000);
};

const density = document.getElementById('density');

browser.storage.local.get(['envs', 'density']).then((r) => {
  envs.value = r.envs || '';
  density.value = r.density || 'compact';
});

density.addEventListener('change', async () => {
  await browser.storage.local.set({ density: density.value });
  flash('Saved');
});

document.getElementById('save').addEventListener('click', async () => {
  await browser.storage.local.set({ envs: envs.value });
  flash('Saved');
});

document.getElementById('reset').addEventListener('click', async () => {
  await browser.storage.local.set({ usage: {} });
  flash('Learned order reset');
});
