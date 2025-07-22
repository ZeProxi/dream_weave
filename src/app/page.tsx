import Image from "next/image";

export default function Dashboard() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-gradient-hero)' }}>
      {/* Header */}
      <header className="border-b backdrop-blur-sm" style={{ 
        borderColor: 'var(--color-border-medium)', 
        backgroundColor: 'var(--color-surface-dark)' + '80' 
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Image
                src="/dreamwalk-logo.webp"
                alt="DreamWalk"
                width={120}
                height={40}
                className="rounded-lg"
                style={{ objectFit: 'contain' }}
              />
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#dashboard" className="font-medium" style={{ color: 'var(--color-accent-purple)' }}>
                Dashboard
              </a>
              <a href="#characters" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Characters
              </a>
              <a href="#devices" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Devices
              </a>
              <a href="#analytics" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Analytics
              </a>
              <a href="#settings" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Settings
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Mission Control</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>Monitor and manage your AI voice experiences in real-time</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="border rounded-xl p-6" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)' 
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Active Sessions</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>12</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-success-green)' + '20' }}>
                <div className="w-6 h-6 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-success-green)' }}></div>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--color-success-green)' }}>+3 from yesterday</p>
          </div>

          <div className="border rounded-xl p-6" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)' 
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Online Devices</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>8</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-cyan)' + '20' }}>
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-accent-cyan)' }}></div>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>2 offline</p>
          </div>

          <div className="border rounded-xl p-6" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)' 
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Characters</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>24</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-purple)' + '20' }}>
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-accent-purple)' }}></div>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>5 recently updated</p>
          </div>

          <div className="border rounded-xl p-6" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)' 
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Avg Response</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>1.2s</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-action-blue)' + '20' }}>
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-action-blue)' }}></div>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--color-success-green)' }}>-0.3s improvement</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Live Sessions */}
          <div className="lg:col-span-2">
            <div className="border rounded-xl p-6" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Live Sessions</h3>
                <button className="text-sm font-medium hover:opacity-80" style={{ color: 'var(--color-accent-purple)' }}>
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { id: 1, location: "Lobby - Device A1", character: "Maya", status: "active", duration: "5:23" },
                  { id: 2, location: "Reception - Device B2", character: "Alex", status: "active", duration: "12:45" },
                  { id: 3, location: "Elevator - Device C1", character: "Luna", status: "idle", duration: "0:45" },
                  { id: 4, location: "Floor 2 - Device D3", character: "Zara", status: "active", duration: "8:12" },
                ].map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 rounded-lg border" style={{ 
                    backgroundColor: 'var(--color-surface-dark)', 
                    borderColor: 'var(--color-border-dark)' 
                  }}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${session.status === 'active' ? 'animate-pulse' : ''}`} style={{ 
                        backgroundColor: session.status === 'active' ? 'var(--color-success-green)' : 'var(--color-warning-yellow)' 
                      }}></div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{session.location}</p>
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Character: {session.character}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm capitalize" style={{ color: 'var(--color-text-secondary)' }}>{session.status}</p>
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{session.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions & Device Status */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="border rounded-xl p-6" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full font-medium py-3 px-4 rounded-lg hover:opacity-90" style={{ 
                  background: 'var(--color-gradient-accent)', 
                  color: 'var(--color-text-primary)' 
                }}>
                  Create New Character
                </button>
                <button className="w-full font-medium py-3 px-4 rounded-lg hover:opacity-90" style={{ 
                  backgroundColor: 'var(--color-action-blue)', 
                  color: 'var(--color-text-primary)' 
                }}>
                  Deploy to Device
                </button>
                <button className="w-full border font-medium py-3 px-4 rounded-lg hover:opacity-80" style={{ 
                  backgroundColor: 'var(--color-surface-dark)', 
                  borderColor: 'var(--color-border-medium)', 
                  color: 'var(--color-text-primary)' 
                }}>
                  View Analytics
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="border rounded-xl p-6" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>System Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>OpenAI API</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success-green)' }}></div>
                    <span className="text-sm" style={{ color: 'var(--color-success-green)' }}>Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>ElevenLabs API</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success-green)' }}></div>
                    <span className="text-sm" style={{ color: 'var(--color-success-green)' }}>Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Database</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-warning-yellow)' }}></div>
                    <span className="text-sm" style={{ color: 'var(--color-warning-yellow)' }}>Degraded</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>WebSocket</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-success-green)' }}></div>
                    <span className="text-sm" style={{ color: 'var(--color-success-green)' }}>Connected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="border rounded-xl p-6" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)' 
          }}>
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Recent Activity</h3>
            <div className="space-y-3">
              {[
                { time: "2 min ago", action: "Character 'Maya' deployed to Device A1", type: "deployment" },
                { time: "5 min ago", action: "New interaction session started in Lobby", type: "session" },
                { time: "12 min ago", action: "System performance improved by 15%", type: "system" },
                { time: "18 min ago", action: "Character 'Luna' voice updated", type: "character" },
                { time: "25 min ago", action: "Device C1 came online", type: "device" },
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:opacity-80" style={{ 
                  backgroundColor: 'var(--color-surface-dark)' 
                }}>
                  <div className="w-2 h-2 rounded-full" style={{ 
                    backgroundColor: 
                      activity.type === 'deployment' ? 'var(--color-accent-purple)' :
                      activity.type === 'session' ? 'var(--color-success-green)' :
                      activity.type === 'system' ? 'var(--color-action-blue)' :
                      activity.type === 'character' ? 'var(--color-accent-magenta)' :
                      'var(--color-accent-cyan)'
                  }}></div>
                  <div className="flex-1">
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{activity.action}</p>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
