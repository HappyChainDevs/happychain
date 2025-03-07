import { type HTMLArkProps, ark } from "@ark-ui/react";
import { forwardRef } from "react";
import { type GuiButtonVariantsProps, recipeGuiButton } from "@happy.tech/design-system"

export interface GuiButtonBaseProps extends GuiButtonVariantsProps {}
export interface GuiButtonElementProps extends GuiButtonBaseProps, 
  Omit<HTMLArkProps<"button">, keyof GuiButtonBaseProps> {
  href?: undefined;
}

export interface GuiAnchorElementProps extends GuiButtonBaseProps, 
  Omit<HTMLArkProps<"a">, keyof GuiButtonBaseProps> {
  href: string;
}

export type GuiButtonProps = GuiButtonElementProps | GuiAnchorElementProps;
export const GuiButton = forwardRef((
  props: GuiButtonProps,
  ref: React.ForwardedRef<HTMLElement>
) => {
  const { 
    intent, 
    scale, 
    aspect,
    className, 
    children, 
    ...rest 
  } = props;
    

  if (rest?.href) {
    return <ark.a
    ref={ref as (React.ForwardedRef<HTMLAnchorElement>)}
    data-hds="button"
    className={recipeGuiButton({ aspect, scale, intent, className })}
    {...(rest as GuiAnchorElementProps)}
  >
    {children}
  </ark.a>
  }
  
  return <ark.button
      ref={ref as (React.ForwardedRef<HTMLButtonElement>)}
      data-hds="button"
      className={recipeGuiButton({ aspect, scale, intent, className })}
      {...(rest as GuiButtonElementProps)}
    >
      {children}
    </ark.button>
}

);