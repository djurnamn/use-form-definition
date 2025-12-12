import { useState } from 'react';
import { Typography, Card, Alert, Button, Space } from 'antd';
import { Link } from 'react-router-dom';
import { useFormDefinition } from '@/lib/form';
import { settingsFormDefinition } from '@/forms/settings';

const { Title, Paragraph } = Typography;

export function SettingsPage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null);
  const { RenderedForm } = useFormDefinition(settingsFormDefinition);

  const handleSubmit = (data: Record<string, unknown>) => {
    console.log('Settings form submitted:', data);
    setSubmittedData(data);
  };

  if (submittedData) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <Alert
            message="Settings saved successfully!"
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Title level={4}>Submitted Data:</Title>
          <pre
            style={{
              background: '#f5f5f5',
              padding: 16,
              borderRadius: 4,
              overflow: 'auto',
              fontSize: 14,
            }}
          >
            {JSON.stringify(submittedData, null, 2)}
          </pre>
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => setSubmittedData(null)}>
              Edit Settings
            </Button>
            <Link to="/">
              <Button>Back to Home</Button>
            </Link>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <Card>
        <Title level={2}>Settings</Title>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          Update your account settings using Ant Design components.
        </Paragraph>

        <RenderedForm onSubmit={handleSubmit} />

        <div style={{ marginTop: 16 }}>
          <Link to="/">
            <Button type="link" style={{ paddingLeft: 0 }}>
              &larr; Back to Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
