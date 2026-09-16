import { Navigate } from 'react-router-dom'

/** Backward-compatible route for bookmarks created before quests were retired. */
export function JourneyPage() {
  return <Navigate to="/progress" replace />
}

export default JourneyPage
