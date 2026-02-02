import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './views/Home';
import Write from './views/Write';
import QuestionDetail from './views/QuestionDetail';
import DarkMatter from './views/DarkMatter';
import Privacy from './views/Privacy';
import { AppProvider } from './contexts/AppContext';

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
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
    </AppProvider>
  );
};

export default App;
