import { useEffect, useState } from 'react';

export default function FullStoryDebug() {
  const [fsStatus, setFsStatus] = useState<string>('Checking...');
  const [fsObject, setFsObject] = useState<any>(null);

  useEffect(() => {
    const checkFullStory = () => {
      if (window.FS) {
        setFsStatus('FullStory is loaded ✅');
        setFsObject(window.FS);
        console.log('FullStory Debug - FS Object:', window.FS);
        
        // Test a simple event
        try {
          window.FS.event('Debug Test Event', { 
            timestamp: new Date().toISOString(),
            test: true 
          });
          console.log('FullStory Debug - Test event sent successfully');
        } catch (error) {
          console.error('FullStory Debug - Error sending test event:', error);
        }
      } else {
        setFsStatus('FullStory not found ❌');
        console.log('FullStory Debug - window.FS not available');
      }
    };

    // Check immediately
    checkFullStory();
    
    // Also check after a delay in case it loads later
    const timeout = setTimeout(checkFullStory, 2000);
    
    return () => clearTimeout(timeout);
  }, []);

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>FullStory Debug:</strong></div>
      <div>Status: {fsStatus}</div>
      {fsObject && (
        <div>
          <div>Methods: {Object.keys(fsObject).join(', ')}</div>
        </div>
      )}
    </div>
  );
}
