import React, { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import { AdminLayout } from "../layouts/AdminLayout";
import { ImportHistoryTab } from "../components/shipment/ImportHistoryTab";
import { CreateShipmentTab } from "../components/shipment/CreateShipmentTab";

const ShipmentOrderPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

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
          {activeTab === 1 && <CreateShipmentTab />}
        </Box>
      </Box>
    </AdminLayout>
  );
};

export default ShipmentOrderPage;
