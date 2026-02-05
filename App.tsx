import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './views/Home';
import Write from './views/Write';
import QuestionDetail from './views/QuestionDetail';
import DarkMatter from './views/DarkMatter';
import Privacy from './views/Privacy';
import { AppProvider } from './contexts/AppContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AssistantInboxProvider } from './contexts/AssistantInboxContext';
import NotificationToaster from './components/NotificationToaster';

const App: React.FC = () => {
  return (
    <AppProvider>
      <NotificationProvider>
        <AssistantInboxProvider>
          <Router>
            <NotificationToaster />
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/write" element={<Write />} />
                <Route path="/question/:id" element={<QuestionDetail />} />
                <Route path="/dark-matter" element={<DarkMatter />} />
                <Route path="/privacy" element={<Privacy />} />
              </Routes>
            </Layout>
          </Router>
        </AssistantInboxProvider>
      </NotificationProvider>
    </AppProvider>
  );
};

export default App;
