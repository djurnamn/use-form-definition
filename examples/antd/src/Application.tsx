import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntApplication } from 'antd';
import { HomePage } from '@/pages/HomePage';
import { SettingsPage } from '@/pages/SettingsPage';

function Application() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <AntApplication>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </BrowserRouter>
      </AntApplication>
    </ConfigProvider>
  );
}

export default Application;
