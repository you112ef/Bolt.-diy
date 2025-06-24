import { toast, type ToastOptions, type ToastContent } from 'react-toastify';
import { playInteractionFeedback } from './interactions';

// Consider different sounds/vibrations for different toast types in the future.
// For now, all use the same feedback.

export function showSuccessToast(content: ToastContent, options?: ToastOptions) {
  playInteractionFeedback();
  return toast.success(content, options);
}

export function showErrorToast(content: ToastContent, options?: ToastOptions) {
  playInteractionFeedback();
  return toast.error(content, options);
}

export function showWarningToast(content: ToastContent, options?: ToastOptions) {
  playInteractionFeedback();
  return toast.warn(content, options);
}

export function showInfoToast(content: ToastContent, options?: ToastOptions) {
  playInteractionFeedback();
  return toast.info(content, options);
}

// It might also be useful to have a generic showToast that calls playInteractionFeedback
// if the specific type (success, error, etc.) isn't known at the call site,
// but for now, typed wrappers are good.
// export function showToast(content: ToastContent, options?: ToastOptions) {
//   playInteractionFeedback();
//   return toast(content, options);
// }
