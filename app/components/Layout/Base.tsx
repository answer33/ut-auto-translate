
import React from 'react';
import { useLocation } from 'react-router-dom';
import { UploadOutlined, UserOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Layout, Menu } from 'antd';

const { Header, Content, Footer, Sider } = Layout;

const blankLayoutPath = ['/login']
interface AppProps {
    children: React.ReactElement
}
const App: React.FC<AppProps> = (props) => {
    const { pathname } = useLocation();
    return (
        <>
            {
                blankLayoutPath.includes(pathname) ?
                    props.children :
                    <Layout>
                        <Sider
                            breakpoint="lg"
                            collapsedWidth="0"
                            onBreakpoint={broken => {
                                console.log(broken);
                            }}
                            onCollapse={(collapsed, type) => {
                                console.log(collapsed, type);
                            }}
                        >
                            <div className="h-32px m-16px bg-white" />
                            <Menu
                                theme="dark"
                                mode="inline"
                                defaultSelectedKeys={['4']}
                                items={[UserOutlined, VideoCameraOutlined, UploadOutlined, UserOutlined].map(
                                    (icon, index) => ({
                                        key: String(index + 1),
                                        icon: React.createElement(icon),
                                        label: `nav ${index + 1}`,
                                    }),
                                )}
                            />
                        </Sider>
                        <Layout className='h-screen'>
                            <Header className='bg-white p-0' />
                            <Content className='bg-white m-24px p-24px mb-0' >
                                {props.children}
                            </Content>
                            <Footer style={{ textAlign: 'center' }}>utcook.com</Footer>
                        </Layout>
                    </Layout>
            }
        </>

    )
};

export default App;