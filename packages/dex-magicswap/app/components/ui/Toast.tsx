import { AlertCircleIcon, CheckCircleIcon, LoaderIcon } from "lucide-react";
import type React from "react";
import { type ExternalToast, Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;
type ToastProps = {
  title: string;
  description?: string;
};

const renderToast = ({ title, description }: ToastProps) => (
  <div className="text-honey-25 text-lg">
    <p className="font-medium">{title}</p>
    {description ? (
      <p className="text-night-100 text-sm">{description}</p>
    ) : null}
  </div>
);

export const showSuccessToast = ({
  title,
  description,
  ...props
}: ToastProps & ExternalToast) =>
  toast.success(
    <>
      <CheckCircleIcon className="h-5 w-5" />
      {renderToast({ title, description })}
    </>,
    props,
  );

export const showErrorToast = ({
  title,
  description,
  ...props
}: ToastProps & ExternalToast) =>
  toast.error(
    <>
      <AlertCircleIcon className="h-5 w-5" />
      {renderToast({ title, description })}
    </>,
    props,
  );

export const showLoadingToast = ({
  title,
  description,
  ...props
}: ToastProps & ExternalToast) =>
  toast.loading(
    <>
      <LoaderIcon className="h-6 w-6 animate-spin" />
      {renderToast({ title, description })}
    </>,
    props,
  );

export const dismissToasts = () => toast.dismiss();

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      expand
      className="group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "w-full overflow-y-clip rounded-md rounded-md bg-background [box-shadow:0_4px_12px_#0000001a] text-sm flex items-center gap-2 p-4 before:content-[''] before:absolute before:inset-0 before:w-full before:h-full before:bg-gradient-to-r before:to-slate-800/30",
          loading:
            "before:from-primary/10 before:via-primary/5 before:rounded-md",
          success:
            "before:from-secondary/10 before:via-secondary/5 before:rounded-md",
          error: "before:from-error/10 before:via-error/5 before:rounded-md",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
