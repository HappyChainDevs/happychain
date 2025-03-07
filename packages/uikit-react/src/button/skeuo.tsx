import { type HTMLArkProps, ark } from "@ark-ui/react";
import { forwardRef, useId } from "react";
import { type SkeuoButtonVariantsProps, recipeSkeuoButton } from "@happy.tech/design-system";

interface SkeuoButtonBaseProps extends SkeuoButtonVariantsProps {}
interface SkeuoButtonElementProps extends SkeuoButtonBaseProps, 
  Omit<HTMLArkProps<"button">, keyof SkeuoButtonBaseProps> {
  href?: undefined;
}

interface SkeuoAnchorElementProps extends SkeuoButtonBaseProps, 
  Omit<HTMLArkProps<"a">, keyof SkeuoButtonBaseProps> {
  href: string;
}

interface SkeuoButtonShellProps extends SkeuoButtonBaseProps, HTMLArkProps<"div"> {}
const SkeuoButtonShell = ({ className, intent, scale, depth, children}: SkeuoButtonShellProps) => {
    return <div className={recipeSkeuoButton.parent({ className })}>
    <span 
      data-part="cuttout" 
      className={recipeSkeuoButton.cuttout({ intent, scale })}
    >
      <span 
        data-part="texture" 
        className={recipeSkeuoButton.texture({ intent, scale })}
      >
        <span data-part="positioner" className={recipeSkeuoButton.positioner()}>
        {children}


          <span 
            data-part="recess"
            className={recipeSkeuoButton.recess({ intent, scale, depth })}
          />
        </span>
      </span>
    </span>
  </div>
}

export type SkeuoButtonProps = SkeuoButtonElementProps | SkeuoAnchorElementProps;
export const SkeuoButton = forwardRef((
  props: SkeuoButtonProps,
  ref: React.ForwardedRef<HTMLElement>
) => {
  const id = useId()
  const { 
    intent, 
    scale, 
    depth,
    alignItems,
    justifyContent,
    className, 
    children, 
    ...rest 
  } = props;
    

  if (rest?.href) {
    return <SkeuoButtonShell className={className}>
    <span className={recipeSkeuoButton.label({ intent, scale, justifyContent, alignItems })} id={id} aria-hidden={true} data-part="label">{children}</span>
    <ark.a
        ref={ref as (React.ForwardedRef<HTMLAnchorElement>)}
        data-part="interactive-element"
        className={recipeSkeuoButton.interactiveElement()}
        {...(rest as SkeuoAnchorElementProps)}
      >
        {children}
      </ark.a>
    </SkeuoButtonShell>
  }
  
  return <SkeuoButtonShell className={className}>
    <span className={recipeSkeuoButton.label({ intent, scale, justifyContent, alignItems })} id={id} aria-hidden={true} data-part="label">{children}</span>

    <ark.button
      ref={ref as (React.ForwardedRef<HTMLButtonElement>)}
      data-part="interactive-element"
      className={recipeSkeuoButton.interactiveElement()}
      aria-labelledby={id}
      {...(rest as SkeuoButtonElementProps)}
    />
    </SkeuoButtonShell>
});