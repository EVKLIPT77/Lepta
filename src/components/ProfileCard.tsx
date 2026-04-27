// Переиспользуемая карточка с информацией о пользователе.
// Используется в /profile (приватный кабинет, viewMode='owner'),
// /u/:username и /author/:slug (публичные страницы, viewMode='public').
//
// В режиме 'public' учитываем privacy_settings — скрытые поля не показываем.
// В режиме 'owner' показываем всё, плюс рядом с приватными полями — иконку
// замочка, чтобы пользователь сразу видел, что у него скрыто.

import { Link } from 'react-router-dom'
import type { PrivacySettings, SocialLinks } from '../contexts/AuthContext'
import { getInterestIcon } from '../lib/interestIcons'

export interface ProfileCardData {
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  christian_name: string | null
  baptism_date: string | null
  city: string | null
  social_links: SocialLinks
  privacy_settings: PrivacySettings
  role: 'reader' | 'author' | 'editor' | 'admin'
}

export interface ProfileInterest {
  id: number
  name: string
  icon: string | null
}

interface Props {
  data: ProfileCardData
  interests: ProfileInterest[]
  viewMode: 'owner' | 'public'
}

function roleLabel(role: ProfileCardData['role']): string | null {
  if (role === 'author') return 'Автор'
  if (role === 'editor') return 'Редактор'
  if (role === 'admin') return 'Администратор'
  return null
}

function formatBaptismDate(iso: string | null): string | null {
  if (!iso) return null
  // ISO date 'YYYY-MM-DD' — просто отрезаем время если оно есть
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return null
  }
}

function normalizeTelegram(value: string): { display: string; href: string } {
  // Принимаем @username, t.me/username или полную ссылку
  const v = value.trim()
  if (v.startsWith('http')) return { display: v, href: v }
  const u = v.replace(/^@/, '').replace(/^t\.me\//i, '')
  return { display: '@' + u, href: 'https://t.me/' + u }
}

function normalizeVk(value: string): { display: string; href: string } {
  const v = value.trim()
  if (v.startsWith('http')) return { display: v, href: v }
  const u = v.replace(/^vk\.com\//i, '')
  return { display: u, href: 'https://vk.com/' + u }
}

function normalizeWebsite(value: string): { display: string; href: string } {
  const v = value.trim()
  const href = v.startsWith('http') ? v : 'https://' + v
  return { display: v.replace(/^https?:\/\//, ''), href }
}

function LockBadge() {
  return (
    <span
      title="Видно только вам"
      className="inline-flex items-center justify-center w-4 h-4 ml-1.5 align-middle"
      style={{ color: '#a8a29e' }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </span>
  )
}

function ProfileCard({ data, interests, viewMode }: Props) {
  const isOwner = viewMode === 'owner'
  const p = data.privacy_settings

  // Должно ли поле X показываться в текущем режиме
  const show = (publicFlag: boolean) => isOwner || publicFlag

  const showChristianName  = data.christian_name && show(p.christian_name)
  const showBaptismDate    = data.baptism_date && show(p.baptism_date)
  const showCity           = data.city && show(p.city)
  const showInterests      = interests.length > 0 && show(p.interests)
  const showSocialLinks    = (data.social_links.telegram || data.social_links.vk || data.social_links.website) && show(p.social_links)

  const role = roleLabel(data.role)

  // Есть ли вообще что показывать в "details" блоке (имя в крещении / дата / город)
  const hasDetailsBlock = showChristianName || showBaptismDate || showCity

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-6">
      {/* Шапка */}
      <div className="flex items-start gap-5">
        {data.avatar_url ? (
          <img
            src={data.avatar_url}
            alt={data.display_name ?? data.username}
            className="w-20 h-20 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-2xl font-display flex-shrink-0">
            {data.username[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-2xl leading-tight" style={{ color: 'var(--color-deep)' }}>
              {data.display_name || data.username}
            </span>
            {role && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(139, 111, 71, 0.15)', color: 'var(--color-accent-dark)' }}
              >
                {role}
              </span>
            )}
          </div>
          <div className="text-sm text-stone-500 mb-2">@{data.username}</div>
          {data.bio && <p className="text-sm text-stone-700">{data.bio}</p>}
        </div>
      </div>

      {/* Детали — имя в крещении, дата, город */}
      {hasDetailsBlock && (
        <dl className="border-t border-stone-100 mt-5 pt-4 space-y-3 text-sm">
          {showChristianName && (
            <div>
              <dt className="text-stone-500 text-xs uppercase tracking-wider">
                Имя в крещении
                {isOwner && !p.christian_name && <LockBadge />}
              </dt>
              <dd className="text-stone-900 mt-0.5">{data.christian_name}</dd>
            </div>
          )}
          {showBaptismDate && (
            <div>
              <dt className="text-stone-500 text-xs uppercase tracking-wider">
                Дата крещения
                {isOwner && !p.baptism_date && <LockBadge />}
              </dt>
              <dd className="text-stone-900 mt-0.5">{formatBaptismDate(data.baptism_date)}</dd>
            </div>
          )}
          {showCity && (
            <div>
              <dt className="text-stone-500 text-xs uppercase tracking-wider">
                Город
                {isOwner && !p.city && <LockBadge />}
              </dt>
              <dd className="text-stone-900 mt-0.5">{data.city}</dd>
            </div>
          )}
        </dl>
      )}

      {/* Интересы */}
      {showInterests && (
        <div className="border-t border-stone-100 mt-5 pt-4">
          <div className="text-stone-500 text-xs uppercase tracking-wider mb-2">
            Интересы
            {isOwner && !p.interests && <LockBadge />}
          </div>
          <div className="flex flex-wrap gap-2">
            {interests.map(tag => {
              const Icon = getInterestIcon(tag.icon)
              return (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                  style={{
                    backgroundColor: 'rgba(139, 111, 71, 0.1)',
                    color: 'var(--color-accent-dark)',
                  }}
                >
                  <Icon size={12} />
                  {tag.name}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Соцсети и контакты */}
      {showSocialLinks && (
        <div className="border-t border-stone-100 mt-5 pt-4">
          <div className="text-stone-500 text-xs uppercase tracking-wider mb-2">
            Контакты
            {isOwner && !p.social_links && <LockBadge />}
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {data.social_links.telegram && (
              <SocialLink kind="telegram" raw={data.social_links.telegram} />
            )}
            {data.social_links.vk && (
              <SocialLink kind="vk" raw={data.social_links.vk} />
            )}
            {data.social_links.website && (
              <SocialLink kind="website" raw={data.social_links.website} />
            )}
          </div>
        </div>
      )}

      {/* Если у владельца все блоки приватны и страница публично пустая — подсказка */}
      {isOwner && !hasDetailsBlock && !showInterests && !showSocialLinks && (
        <p className="text-xs text-stone-500 mt-5 pt-4 border-t border-stone-100 italic">
          Расскажите о себе, добавьте интересы и контакты — это поможет другим находить единомышленников. <Link to="/profile/edit" className="underline">Редактировать профиль</Link>
        </p>
      )}
    </div>
  )
}

function SocialLink({ kind, raw }: { kind: 'telegram' | 'vk' | 'website'; raw: string }) {
  const norm =
    kind === 'telegram' ? normalizeTelegram(raw)
    : kind === 'vk'     ? normalizeVk(raw)
    :                     normalizeWebsite(raw)

  const label =
    kind === 'telegram' ? 'Telegram'
    : kind === 'vk'     ? 'VK'
    :                     'Сайт'

  return (
    <a
      href={norm.href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 hover:underline"
      style={{ color: 'var(--color-accent-dark)' }}
    >
      <span className="text-stone-500 text-xs">{label}:</span>
      <span>{norm.display}</span>
    </a>
  )
}

export default ProfileCard
