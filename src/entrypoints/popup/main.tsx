import '@fontsource/dotgothic16';
import { render } from 'preact';
import { syncDocumentLanguage } from '@/i18n/t';
import { App } from './App';
import './style.css';

syncDocumentLanguage(document);

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element');
render(<App />, root);
