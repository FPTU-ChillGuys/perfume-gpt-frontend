import { Box, Stepper, Step, StepLabel } from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import type { CancelRequestStatus } from "@/services/orderService";

interface CancelStatusStepperProps {
  status: CancelRequestStatus;
  isRefunded?: boolean;
}

export const CancelStatusStepper = ({
  status,
  isRefunded,
}: CancelStatusStepperProps) => {
  return (
    <Box
      sx={
        status === "Approved" || status === "Rejected"
          ? {
              "& .MuiStepConnector-root": {
                borderTopColor: "#d32f2f !important",
                borderTopWidth: 2,
              },
              "& .MuiStepIcon-root.Mui-completed": {
                color: "#d32f2f !important",
              },
            }
          : {}
      }
    >
      <Stepper alternativeLabel>
        <Step completed>
          <StepLabel>Yêu cầu hủy</StepLabel>
        </Step>
        <Step
          completed={status !== "Pending"}
          sx={
            status === "Pending"
              ? {
                  "& .MuiStepIcon-root": {
                    color: "#d32f2f",
                  },
                  "& .MuiStepConnector-root": {
                    borderTopColor: "#d32f2f !important",
                    borderTopWidth: 3,
                  },
                }
              : {}
          }
        >
          <StepLabel>
            {status === "Pending" || status === "Rejected"
              ? "Đang xử lý"
              : "Đã duyệt"}
          </StepLabel>
        </Step>
        <Step completed={status === "Approved"}>
          <StepLabel
            icon={
              status === "Rejected" ? (
                <ErrorIcon sx={{ color: "#d32f2f", fontSize: "1.5rem" }} />
              ) : undefined
            }
          >
            {status === "Rejected"
              ? "Từ chối"
              : status === "Approved" && isRefunded
                ? "Đã hoàn tiền"
                : "Hoàn tất"}
          </StepLabel>
        </Step>
      </Stepper>
    </Box>
  );
};
