# Live Polling System v3

A real-time classroom polling system that enables teachers to create and manage live polls while students can join and participate in interactive voting sessions. Built with modern web technologies and real-time communication.

## Features

- **Real-time Updates**: Instant results as students vote
- **Teacher Dashboard**: 
  - Create and manage polls
  - Start/stop questions
  - View live results
  - Question history
  - Kick participants
  - Set time limits for questions
- **Student Interface**:
  - Easy join process
  - Live question view
  - Real-time results visualization
  - Response confirmation
  - Timer countdown
- **Interactive UI**: Modern, responsive design with Tailwind CSS

## Tech Stack

### Backend
- Node.js
- Express.js
- Socket.IO (v4.7.2)
- CORS support
- In-memory data store

### Frontend
- React (v18.2.0)
- Socket.IO Client (v4.7.2)
- Parcel Bundler (v2.9.3)
- Tailwind CSS (via CDN)
- Modern ES6+ JavaScript

## Project Structure

```
live-polling-system-v3/
├── backend/                # Backend server
│   ├── index.js           # Main server file
│   └── package.json       # Backend dependencies
├── frontend/              # Frontend application
│   ├── index.html        # Entry HTML file
│   ├── package.json      # Frontend dependencies
│   └── src/              # React source files
│       ├── App.jsx       # Main React component
│       ├── Landing.jsx   # Landing page component
│       ├── main.jsx      # React entry point
│       ├── PollHistory.jsx# Poll history component
│       ├── Student.jsx   # Student view component
│       ├── styles.css    # Custom styles
│       └── Teacher.jsx   # Teacher view component
└── README.md             # Project documentation
```

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Modern web browser with WebSocket support

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd live-polling-system-v3
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm start
   ```
   Server will run on http://localhost:4000

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   Application will be available at http://localhost:3000

## Architecture

### Backend Architecture
- Express server handling HTTP requests
- Socket.IO for real-time bi-directional communication
- In-memory data store for:
  - Active polls
  - Questions
  - Participants
  - Results
- Event-based communication system

### Frontend Architecture
- React components for modular UI
- Socket.IO client for real-time updates
- Responsive design with Tailwind CSS
- State management using React hooks
- Real-time data synchronization

### Communication Flow
1. Teacher creates/starts a question
2. Server broadcasts to all connected students
3. Students submit answers
4. Server processes and broadcasts updated results
5. All clients update their UI in real-time

## Development

### Backend Development
```bash
cd backend
npm run dev  # Runs with nodemon for auto-restart
```

### Frontend Development
```bash
cd frontend
npm start    # Runs with hot-reload enabled
```

### Building for Production
```bash
cd frontend
npm run build
```

## Important Notes

- The system uses an in-memory store - all data is cleared when the server restarts
- Multiple teachers can create different polling sessions
- Students are identified by their chosen names (must be unique)
- Questions can have time limits
- Results are calculated and displayed in real-time
- The system supports concurrent polling sessions

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge (Chromium-based)
- Any modern browser with WebSocket support

## Known Limitations

- Data persistence is not implemented (in-memory only)
- No authentication system
- Single server instance (no clustering)
- Session data is lost on server restart

## Future Enhancements

- Persistent data storage
- User authentication
- Multiple choice question types
- Custom themes
- Export results
- Admin dashboard
- Mobile app version

## License

This project is released under the MIT License.
