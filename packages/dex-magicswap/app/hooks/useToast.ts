import { useEffect, useRef } from "react";

import {
  dismissToasts,
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "~/components/ui/Toast";

export const useToast = ({
  title,
  isLoading,
  loadingDescription = "Transaction in progress...",
  isSuccess,
  successDescription = "Transaction successful",
  isError,
  errorDescription = "Transaction failed",
}: {
  title: string;
  isLoading: boolean;
  loadingDescription?: string;
  isSuccess: boolean;
  successDescription?: string;
  isError: boolean;
  errorDescription?: string;
}) => {
  const toastRef = useRef<string | number | undefined>();

  useEffect(() => {
    if (isSuccess && toastRef.current) {
      showSuccessToast({
        id: toastRef.current,
        title,
        description: successDescription,
        duration: 3_500,
      });
      toastRef.current = undefined;
    } else if (isError && toastRef.current) {
      if (errorDescription.startsWith("User rejected the request")) {
        dismissToasts();
      } else {
        showErrorToast({
          id: toastRef.current,
          title,
          description: errorDescription,
          duration: 3_500,
        });
      }

      toastRef.current = undefined;
    } else if (isLoading) {
      toastRef.current = showLoadingToast({
        title,
        description: loadingDescription,
        duration: Number.POSITIVE_INFINITY,
      });
    } else if (toastRef.current) {
      dismissToasts();
    }
  }, [
    title,
    isLoading,
    loadingDescription,
    isSuccess,
    successDescription,
    isError,
    errorDescription,
  ]);

  return toastRef;
};
