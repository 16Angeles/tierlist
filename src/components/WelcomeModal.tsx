import { useState } from 'react'
import { motion } from 'motion/react'
import { Sparkles, Users } from 'lucide-react'
import { Modal } from './Modal'
import type { Mode, PersonId } from '../types'

export function WelcomeModal({
  open,
  onClose,
  onStart,
  defaultName,
  defaultU1,
  defaultU2,
}: {
  open: boolean
  onClose: () => void
  onStart: (data: {
    name: string
    u1: string
    u2: string
    mode: Mode
    who: PersonId
  }) => void
  defaultName: string
  defaultU1: string
  defaultU2: string
}) {
  const [name, setName] = useState(defaultName)
  const [u1, setU1] = useState(defaultU1)
  const [u2, setU2] = useState(defaultU2)
  const [mode, setMode] = useState<Mode>('split')
  const [who, setWho] = useState<PersonId>('u1')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Создаём тирлист"
      subtitle="Пара минут — и можно звать друга"
      maxWidth="max-w-md"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Позже
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              onStart({
                name: name.trim() || 'Наш тирлист',
                u1: u1.trim() || 'Я',
                u2: u2.trim() || 'Друг',
                mode,
                who,
              })
            }
          >
            <Sparkles size={14} /> Начать
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Название тирлиста</span>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Наш тирлист"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Ваше имя</span>
            <input className="field" value={u1} onChange={(e) => setU1(e.target.value)} placeholder="Саша" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Имя друга</span>
            <input className="field" value={u2} onChange={(e) => setU2(e.target.value)} placeholder="Дима" />
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">Как оцениваем?</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { id: 'split', label: 'Каждый по-своему', desc: 'Среднее двух оценок' },
                { id: 'shared', label: 'Одной оценкой', desc: 'Решаем вместе' },
              ] as const
            ).map((o) => (
              <motion.button
                key={o.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setMode(o.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  mode === o.id
                    ? 'border-amber-400/50 bg-amber-400/[.08]'
                    : 'border-white/[.08] bg-white/[.025] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white">
                  {o.id === 'split' && <Users size={13} />}
                  {o.label}
                </div>
                <div className="mt-0.5 text-[10.5px] leading-snug text-white/40">{o.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-[11.5px] font-medium text-white/50">
            Кто вы на этом устройстве?
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'u1' as PersonId, label: u1 || 'Я' },
                { id: 'u2' as PersonId, label: u2 || 'Друг' },
              ]
            ).map((w) => (
              <button
                key={w.id}
                onClick={() => setWho(w.id)}
                className={`rounded-xl border px-3 py-2 text-[12.5px] font-semibold transition ${
                  who === w.id
                    ? 'border-amber-400/50 bg-amber-400/[.08] text-white'
                    : 'border-white/[.08] bg-white/[.025] text-white/55 hover:border-white/20'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/30">
            Запомним выбор на этом компьютере. У друга на его устройстве нужно будет выбрать своё имя.
          </p>
        </div>

        <p className="rounded-xl border border-white/[.07] bg-white/[.025] p-3 text-[11.5px] leading-relaxed text-white/45">
          Дальше откройте <b className="text-white/70">Настройки → Подключение</b>, выберите GitHub и
          отправьте другу ссылку — после этого тирлист будет общим на двух компьютерах.
        </p>
      </div>
    </Modal>
  )
}
