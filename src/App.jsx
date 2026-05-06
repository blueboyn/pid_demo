import { useState } from 'react'
import './App.css'
import AnimDemo from './anim_demo.jsx'
import PidPilot from './pid_pilot.jsx'
import RichSymbols from './rich_symbols.jsx'
import PidStudio from './pid_studio.jsx'

const MENU_STRUCTURE = [
  {
    id: 'demo',
    label: '데모',
    children: [
      { id: 'anim_demo',    label: '애니메이션 데모', component: AnimDemo },
      { id: 'rich_symbols', label: '리치 심볼',       component: RichSymbols },
      { id: 'pid_studio',   label: 'PID STUDIO',      component: PidStudio },
    ],
  },
  {
    id: 'tools',
    label: '도구',
    children: [
      { id: 'pid_pilot', label: 'PID 파일럿', component: PidPilot },
    ],
  },
]

function App() {
  const [activeTopMenu, setActiveTopMenu] = useState(MENU_STRUCTURE[0].id)
  const [openTabs, setOpenTabs] = useState([])
  const [activeTab, setActiveTab] = useState(null)

  const currentMenu = MENU_STRUCTURE.find(m => m.id === activeTopMenu)

  function openTab(item) {
    if (!openTabs.find(t => t.id === item.id)) {
      setOpenTabs(prev => [...prev, item])
    }
    setActiveTab(item.id)
  }

  function closeTab(id, e) {
    e.stopPropagation()
    const newTabs = openTabs.filter(t => t.id !== id)
    setOpenTabs(newTabs)
    if (activeTab === id) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
    }
  }

  return (
    <div className="app-layout">
      {/* 상단 메뉴 */}
      <header className="top-menu">
        <div className="top-menu-brand">PID Demo</div>
        <nav className="top-menu-nav">
          {MENU_STRUCTURE.map(menu => (
            <button
              key={menu.id}
              className={`top-menu-item${activeTopMenu === menu.id ? ' active' : ''}`}
              onClick={() => setActiveTopMenu(menu.id)}
            >
              {menu.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="main-area">
        {/* 왼쪽 사이드바 */}
        <aside className="sidebar">
          <div className="sidebar-title">{currentMenu?.label}</div>
          <ul className="sidebar-menu">
            {currentMenu?.children.map(item => (
              <li
                key={item.id}
                className={`sidebar-item${activeTab === item.id ? ' active' : ''}`}
                onClick={() => openTab(item)}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </aside>

        {/* 중앙 컨텐츠 */}
        <div className="content-area">
          {openTabs.length > 0 && (
            <div className="tab-bar">
              {openTabs.map(tab => (
                <div
                  key={tab.id}
                  className={`tab${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.label}</span>
                  <button
                    className="tab-close"
                    onClick={(e) => closeTab(tab.id, e)}
                    aria-label="탭 닫기"
                  >×</button>
                </div>
              ))}
            </div>
          )}
          <div className="tab-content">
            {openTabs.length === 0 ? (
              <div className="empty-content">
                <p>왼쪽 메뉴에서 항목을 선택하세요</p>
              </div>
            ) : (
              openTabs.map(tab => (
                <div
                  key={tab.id}
                  className={`tab-panel${activeTab === tab.id ? ' active' : ''}`}
                >
                  <tab.component />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
