import { Box, Stepper, Step, StepLabel, Typography, Stack } from "@mui/material";
import { CheckCircle, HourglassEmpty } from "@mui/icons-material";
import type { CancelRequestStatus } from "@/services/orderService";

interface CancelStatusStepperProps {
  status: CancelRequestStatus;
  isRefunded?: boolean;
}

export const CancelStatusStepper = ({
  status,
  isRefunded,
}: CancelStatusStepperProps) => {
  const getActiveStep = () => {
    if (status === "Pending") return 1;
    if (status === "Approved" || status === "Rejected") return 2;
    return 2;
  };

  const getStepColor = (stepIndex: number) => {
    if (stepIndex <= getActiveStep()) {
      if (stepIndex === 2 && status === "Rejected") {
        return "error";
      }
      if (stepIndex === 2 && status === "Approved" && isRefunded) {
        return "success";
      }
      return "inherit";
    }
    return "disabled";
  };

  const stepLabels = [
    "Yêu cầu hủy",
    status === "Rejected"
      ? "Từ chối"
      : status === "Pending"
        ? "Đang xử lý"
        : "Đã duyệt",
    status === "Approved" && isRefunded ? "Đã hoàn tiền" : "Hoàn tất",
  ];

  return (
    <Box sx={{ py: 2 }}>
      <Stepper activeStep={getActiveStep()} alternativeLabel>
        {stepLabels.map((label, index) => (
          <Step
            key={index}
            completed={index < getActiveStep()}
            sx={{
              "& .MuiStepLabel-root .Mui-completed": {
                color: getStepColor(index),
              },
              "& .MuiStepLabel-label.Mui-completed": {
                color: getStepColor(index),
              },
            }}
          >
            <StepLabel
              sx={{
                "& .MuiStepIcon-root": {
                  color: getStepColor(index),
                },
                "& .MuiStepIcon-text": {
                  fill: "white",
                },
              }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};
