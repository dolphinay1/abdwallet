document.addEventListener("DOMContentLoaded", () => {
  const frame = document.getElementById('wallet-frame');
  if (frame) {
    frame.onload = () => {
      const loader = document.getElementById('loading');
      if (loader) {
        loader.style.display = 'none';
      }
    };
  }
});
