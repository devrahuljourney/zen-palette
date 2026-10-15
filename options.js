const envs = document.getElementById('envs');
const status = document.getElementById('status');

const flash = (msg) => {
  status.textContent = msg;
  setTimeout(() => (status.textContent = ''), 2000);
};

browser.storage.local.get('envs').then((r) => {
  envs.value = r.envs || '';
});

document.getElementById('save').addEventListener('click', async () => {
  await browser.storage.local.set({ envs: envs.value });
  flash('Saved');
});

document.getElementById('reset').addEventListener('click', async () => {
  await browser.storage.local.set({ usage: {} });
  flash('Learned order reset');
});
