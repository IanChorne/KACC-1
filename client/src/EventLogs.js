import React, { useState, useEffect } from 'react';
import axios from 'axios';
//For getting teamID from URL
import { useParams } from 'react-router-dom'; 

const EventLogs = () => {
  //Get the account ID from the URL
  const { account_id } = useParams();
  const [eventLogs, setEventLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    //Fetch event logs based on account ID
    const fetchEventLogs = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/events/event-logs/${account_id}`);
        const logs = response.data;
        setEventLogs(logs);
        
      } 
      catch (err) {
        setError('Error fetching event logs');
      }
    };

    fetchEventLogs();
  }, [account_id]);

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h1>Event Logs for Account {account_id}</h1>
      {eventLogs.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Account ID</th>
              <th>Before Image</th>
              <th>After Image</th>
              <th>Changed By User ID</th>
              <th>Event Time</th>
            </tr>
          </thead>
          <tbody>
            {eventLogs.map((log) => (
              <tr key={log.event_id}>
                <td>{log.account_id}</td>
                <td>{log.before_image || 'N/A'}</td>
                <td>{log.after_image}</td>
                <td>{log.changed_by_user_id}</td>
                <td>{new Date(log.event_time).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No event logs available for this team.</p>
      )}
    </div>
  );
};

export default EventLogs;
