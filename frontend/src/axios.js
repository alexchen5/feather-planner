import axios from 'axios';

axios.defaults.baseURL = 'http://127.0.0.1:49759/';
axios.defaults.headers.put['Content-Type'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.headers.delete['Content-Type'] = 'application/json';