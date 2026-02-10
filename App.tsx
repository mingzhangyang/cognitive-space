import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './views/Home';
import Write from './views/Write';
import QuestionDetail from './views/QuestionDetail';
import WanderingPlanet from './views/WanderingPlanet';
import Privacy from './views/Privacy';
import About from './views/About';
import { AppProvider } from './contexts/AppContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AssistantInboxProvider } from './contexts/AssistantInboxContext';
import NotificationToaster from './components/NotificationToaster';
import SeoManager from './components/SeoManager';

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-route-in">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/write" element={<Write />} />
        <Route path="/question/:id" element={<QuestionDetail />} />
        <Route path="/wandering-planet" element={<WanderingPlanet />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <NotificationProvider>
        <AssistantInboxProvider>
          <Router>
            <SeoManager />
            <NotificationToaster />
            <Layout>
              <AnimatedRoutes />
            </Layout>
          </Router>
        </AssistantInboxProvider>
      </NotificationProvider>
    </AppProvider>
  );
};

export default App;
