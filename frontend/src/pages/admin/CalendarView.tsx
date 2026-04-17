import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { appointmentAPI } from '../../lib/api';
import { formatTime } from '../../lib/utils';

export default function CalendarView() {
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month'|'week'>('week');

  useEffect(() => {
    const start = new Date(currentDate); start.setDate(1); start.setHours(0,0,0,0);
    const end = new Date(start); end.setMonth(end.getMonth()+1);
    appointmentAPI.getCalendarEvents({ start: start.toISOString(), end: end.toISOString() })
      .then(r => setEvents(r.data.events)).catch(() => {});
  }, [currentDate]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return events.filter(e => e.start.startsWith(dateStr));
  };

  const today = new Date();
  const isToday = (day: number) => today.getFullYear()===currentDate.getFullYear() && today.getMonth()===currentDate.getMonth() && today.getDate()===day;

  // Week view helpers
  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({length:7}, (_,i) => { const d=new Date(start); d.setDate(d.getDate()+i); return d; });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Calendar</h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button onClick={()=>setView('week')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${view==='week'?'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white':'text-slate-500 dark:text-slate-400'}`}>Week</button>
            <button onClick={()=>setView('month')} className={`px-3 py-1.5 text-xs font-medium rounded-md ${view==='month'?'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white':'text-slate-500 dark:text-slate-400'}`}>Month</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>{const d=new Date(currentDate); d.setMonth(d.getMonth()-1); setCurrentDate(d);}} className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800"><ChevronLeft className="w-5 h-5"/></button>
            <span className="font-semibold text-sm min-w-[140px] text-center">{currentDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span>
            <button onClick={()=>{const d=new Date(currentDate); d.setMonth(d.getMonth()+1); setCurrentDate(d);}} className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800"><ChevronRight className="w-5 h-5"/></button>
          </div>
        </div>
      </div>

      {view === 'month' ? (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 border-b">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="px-2 py-3 text-xs font-semibold text-slate-500 text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({length: firstDay}).map((_,i) => <div key={`e${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50"/>)}
            {Array.from({length: daysInMonth}).map((_,i) => {
              const day = i+1;
              const dayEvents = getEventsForDay(day);
              return (
                <div key={day} className={`min-h-[100px] border-b border-r border-slate-100 p-1.5 ${isToday(day)?'bg-primary-50/50':''}`}>
                  <span className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full ${isToday(day)?'bg-primary-600 text-white':'text-slate-600'}`}>{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0,3).map((e:any) => (
                      <div key={e.id} className="text-[10px] px-1.5 py-0.5 rounded truncate text-white" style={{backgroundColor:e.color}} title={e.title}>{e.title}</div>
                    ))}
                    {dayEvents.length > 3 && <div className="text-[10px] text-slate-500 px-1">+{dayEvents.length-3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 border-b">
            {getWeekDays().map(d => (
              <div key={d.toISOString()} className={`px-2 py-3 text-center ${d.toDateString()===today.toDateString()?'bg-primary-50':''}`}>
                <div className="text-xs text-slate-500">{d.toLocaleDateString('en-US',{weekday:'short'})}</div>
                <div className={`text-lg font-bold ${d.toDateString()===today.toDateString()?'text-primary-600':'text-slate-900 dark:text-white'}`}>{d.getDate()}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[400px]">
            {getWeekDays().map(d => {
              const dateStr = d.toISOString().split('T')[0];
              const dayEvents = events.filter(e=>e.start.startsWith(dateStr));
              return (
                <div key={dateStr} className="border-r border-slate-100 p-2 space-y-1">
                  {dayEvents.map((e:any) => (
                    <div key={e.id} className="text-xs p-2 rounded-lg text-white" style={{backgroundColor:e.color}}>
                      <div className="font-medium truncate">{e.title}</div>
                      <div className="opacity-75">{formatTime(e.start.split('T')[1]?.slice(0,5))}</div>
                      <div className="opacity-75 text-[10px]">#{e.extendedProps?.tokenNumber} · {e.extendedProps?.status}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
