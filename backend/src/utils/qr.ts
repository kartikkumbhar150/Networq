import QRCode from 'qrcode';

/**
 * Generates a QR code as a base64-encoded PNG data URL.
 * @param data - The string to encode (e.g. qrToken UUID)
 */
export async function generateQRDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}
