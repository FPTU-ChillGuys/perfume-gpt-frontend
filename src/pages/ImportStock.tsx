import React, { useState, useEffect } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { ImportHistoryTab } from "../components/shipment/ImportHistoryTab";
import { CreateImportStockTab } from "../components/shipment/CreateImportStockTab";

const ImportStock: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-switch to "Create" tab if importData param is present
  useEffect(() => {
    const importData = searchParams.get("importData");
    if (importData) {
      setActiveTab(1);
    }
  }, [searchParams]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

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
