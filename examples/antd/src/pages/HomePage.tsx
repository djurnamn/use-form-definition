import { Typography, Card, List, Divider, Space } from 'antd';
import { Link } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

export function HomePage() {
  const features = [
    'Ant Design Input with Form.Item wrapper',
    'Ant Design Select and DatePicker',
    'Hidden input pattern for non-native form elements',
    'Ant Design Row/Col responsive grid layout',
    'No Field wrapper (ignoreFieldWrapper)',
  ];

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <Card>
        <Title level={2}>use-form-definition</Title>
        <Text type="secondary">Ant Design Example</Text>

        <Paragraph style={{ marginTop: 16 }}>
          This example demonstrates integrating use-form-definition with Ant Design components.
        </Paragraph>

        <Divider />

        <Title level={4}>Example Forms</Title>
        <Card
          hoverable
          style={{ marginBottom: 24 }}
        >
          <Link to="/settings" style={{ display: 'block' }}>
            <Space direction="vertical" size={0}>
              <Text strong style={{ color: '#1677ff' }}>
                Settings Form
              </Text>
              <Text type="secondary">
                Demonstrates various Ant Design field types
              </Text>
            </Space>
          </Link>
        </Card>

        <Title level={4}>Features Demonstrated</Title>
        <List
          size="small"
          dataSource={features}
          renderItem={(item) => (
            <List.Item>
              <Text>{item}</Text>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
