export default function SimpleHome() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '600px',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#333', marginBottom: '1rem' }}>🚀 APOLO</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Sistema de Gestión de Campañas - ¡Funcionando correctamente!
        </p>
        
        <div style={{ 
          display: 'grid', 
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
        }}>
          <a 
            href="/login" 
            style={{
              padding: '12px 24px',
              backgroundColor: '#0066cc',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}
          >
            Iniciar Sesión
          </a>
          
          <a 
            href="/api/health" 
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}
          >
            Health Check
          </a>
          
          <a 
            href="/api/debug" 
            style={{
              padding: '12px 24px',
              backgroundColor: '#ffc107',
              color: 'black',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}
          >
            Debug Info
          </a>
        </div>
        
        <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#999' }}>
          <p>Build: {new Date().toISOString()}</p>
          <p>Environment: {process.env.NODE_ENV || 'development'}</p>
        </div>
      </div>
    </div>
  )
}