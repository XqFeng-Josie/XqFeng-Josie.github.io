"""Render the static comparison from the same records as the replay player."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root = Path(__file__).resolve().parents[1]
cases = json.loads((root / 'api/case-replays.json').read_text())['cases']
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10, 'text.color': '#3d3225', 'axes.labelcolor': '#7a6b56', 'xtick.color': '#7a6b56', 'ytick.color': '#7a6b56'})
fig, axes = plt.subplots(5, 1, figsize=(12, 15), layout='constrained', facecolor='#f9f0de')
for i, (case, ax) in enumerate(zip(cases, axes)):
    frames = case['frames']; best = None; bx=[]; by=[]; valid=[]
    for row in frames:
        value = row['value']
        if isinstance(value, (int, float)):
            valid.append((row['iteration'], value))
            best = value if best is None else (max(best,value) if case['higher_is_better'] else min(best,value))
        if best is not None: bx.append(row['iteration']); by.append(best)
        if row['submitted'] and value is None:
            ax.plot(row['iteration'], .025, marker='x', color='#a89880', transform=ax.get_xaxis_transform(), clip_on=False)
    ax.set_facecolor('#fffbf2')
    ax.grid(color='#dfd3bf', linewidth=.6)
    if valid:
        ax.plot(*zip(*valid), '-o', color='#5a8fa0', linewidth=1, markersize=4, label='Valid evaluation')
        ax.step(bx, by, where='post', color='#6b7a45', linewidth=2, label='Agent best so far')
    for label, val, color in [('Theoretical best',case['theoretical_best'],'#b38c28'),('Theoretical worst',case['theoretical_worst'],'#a3907d')]:
        if val is not None:
            ax.axhline(val, color=color, linestyle='--', linewidth=1)
            ax.annotate(f'{label}: {val:g}', (1, val), xycoords=('axes fraction','data'), xytext=(-5,5),textcoords='offset points',ha='right',color=color,fontsize=9)
    ax.set_xlim(.5, case['total_iterations']+.5); ax.margins(y=.18)
    ax.set_title(f"Case {i+1} · {case['title']}\n{case['model']} / {case['task']}", loc='left', fontsize=12, pad=10)
    ax.set_ylabel(case['metric_name']); ax.set_xlabel('Iteration')
    for spine in ax.spines.values(): spine.set_color('#d4c4a8')
fig.suptitle('Five research trajectories\nRaw metrics · each panel uses its own scale · × submission without valid score',fontsize=14)
fig.savefig(root / 'figs/case_replay_comparison.png', dpi=160, facecolor=fig.get_facecolor())
plt.close(fig)
