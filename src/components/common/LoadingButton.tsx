import { Button, CircularProgress } from "@mui/material";
import type { ButtonProps } from "@mui/material";

export interface LoadingButtonProps extends ButtonProps {
  /** When true, shows a spinner and disables the button */
  loading?: boolean;
  /** Custom size of the spinner in px. If not provided, it scales with button size automatically. */
  spinnerSize?: number;
}

export const LoadingButton = ({
  loading = false,
  spinnerSize,
  disabled,
  children,
  startIcon,
  sx,
  size = "medium",
  ...rest
}: LoadingButtonProps) => {
  const defaultSpinnerSize = size === "small" ? 16 : size === "large" ? 24 : 20;
  const actualSpinnerSize = spinnerSize || defaultSpinnerSize;

  return (
    <Button
      size={size}
      disabled={loading || disabled}
      startIcon={
        loading ? (
          <CircularProgress size={actualSpinnerSize} color="inherit" />
        ) : (
          startIcon
        )
      }
      sx={{
        position: "relative",
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Button>
  );
};
