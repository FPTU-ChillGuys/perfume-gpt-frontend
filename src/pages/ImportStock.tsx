import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Tabs, Tab } from "@mui/material";
import { AdminLayout } from "../layouts/AdminLayout";
import { ImportHistoryTab } from "../components/shipment/ImportHistoryTab";
import { CreateImportStockTab } from "../components/shipment/CreateImportStockTab";

const ImportStock: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Auto-switch tab when importData param is present
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const tabValue = parseInt(tabParam, 10);
      if (!isNaN(tabValue) && tabValue !== activeTab) {
        setActiveTab(tabValue);
        // Clear the tab param after processing
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("tab");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, activeTab, setSearchParams]);

  return (
    <AdminLayout>
      <Box>
        {/* Tab Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Lịch sử nhập hàng" />
            <Tab label="Tạo đợt nhập hàng" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box>
          {activeTab === 0 && <ImportHistoryTab />}
          {activeTab === 1 && <CreateImportStockTab />}
        </Box>
      </Box>
    </AdminLayout>
  );
};

export default ImportStock;
