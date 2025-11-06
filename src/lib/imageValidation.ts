export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'tiff', 'bmp'];
const MIN_FILE_SIZE = 10240; // 10 KB

export const validateLogoImage = async (file: File): Promise<ImageValidationResult> => {
  // Check file format
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || !ALLOWED_FORMATS.includes(fileExt)) {
    return {
      valid: false,
      error: 'Logo must be in JPG, PNG, TIFF, or BMP format'
    };
  }

  // Check file size
  if (file.size < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: `Logo file size must be at least ${MIN_FILE_SIZE / 1024} KB`
    };
  }

  // Check dimensions and aspect ratio
  const dimensions = await getImageDimensions(file);
  
  if (dimensions.width < 250 || dimensions.height < 250) {
    return {
      valid: false,
      error: 'Logo minimum resolution is 250x250 pixels'
    };
  }

  if (dimensions.width > 5000 || dimensions.height > 5000) {
    return {
      valid: false,
      error: 'Logo maximum resolution is 5000x5000 pixels'
    };
  }

  // Check for square aspect ratio (1:1)
  if (dimensions.width !== dimensions.height) {
    return {
      valid: false,
      error: 'Logo must be square (1:1 aspect ratio)'
    };
  }

  return { valid: true };
};

export const validateCoverPhoto = async (file: File): Promise<ImageValidationResult> => {
  // Check file format
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || !ALLOWED_FORMATS.includes(fileExt)) {
    return {
      valid: false,
      error: 'Cover photo must be in JPG, PNG, TIFF, or BMP format'
    };
  }

  // Check file size
  if (file.size < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: `Cover photo file size must be at least ${MIN_FILE_SIZE / 1024} KB`
    };
  }

  // Check dimensions
  const dimensions = await getImageDimensions(file);
  
  if (dimensions.width < 480 || dimensions.height < 270) {
    return {
      valid: false,
      error: 'Cover photo minimum resolution is 480x270 pixels'
    };
  }

  if (dimensions.width > 2120 || dimensions.height > 1192) {
    return {
      valid: false,
      error: 'Cover photo maximum resolution is 2120x1192 pixels'
    };
  }

  // Note: Aspect ratio will be adjusted to 16:9 automatically
  // No need to validate aspect ratio as it will be cropped

  return { valid: true };
};

export const validateOtherPhoto = async (file: File): Promise<ImageValidationResult> => {
  // For other photos, use less strict validation
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || !ALLOWED_FORMATS.includes(fileExt)) {
    return {
      valid: false,
      error: 'Photo must be in JPG, PNG, TIFF, or BMP format'
    };
  }

  if (file.size < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: `Photo file size must be at least ${MIN_FILE_SIZE / 1024} KB`
    };
  }

  return { valid: true };
};

const getImageDimensions = (file: File): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};
