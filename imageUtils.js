/**
 * imageUtils.js
 * Redimensiona e comprime imagens no navegador (via canvas) antes de
 * salvar no localStorage, já que o limite é ~5MB por origem.
 */

const MeuDateImage = (() => {
  const MAX_WIDTH = 900;
  const QUALITY = 0.72;
  const MAX_DATAURL_BYTES = 500 * 1024; // aviso acima de ~500KB

  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Não foi possível ler essa imagem.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      reader.readAsDataURL(file);
    });
  }

  function estimateBytes(dataURL) {
    // cada 4 caracteres base64 ≈ 3 bytes
    const base64 = dataURL.split(',')[1] || '';
    return Math.round((base64.length * 3) / 4);
  }

  return {
    /**
     * Retorna { dataURL, bytes, tooLarge } com a imagem já comprimida.
     */
    async compress(file) {
      if (!file.type.startsWith('image/')) {
        throw new Error('Escolha um arquivo de imagem.');
      }
      const img = await fileToImage(file);
      const scale = Math.min(1, MAX_WIDTH / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataURL = canvas.toDataURL('image/jpeg', QUALITY);
      const bytes = estimateBytes(dataURL);
      return { dataURL, bytes, tooLarge: bytes > MAX_DATAURL_BYTES };
    },
  };
})();
