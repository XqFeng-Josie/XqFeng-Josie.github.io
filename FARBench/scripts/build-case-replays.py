"""Build compact homepage replays from the checked-in experiment records."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
cases = json.loads((root / 'api/analysis-cases.json').read_text())['cases']
for case in cases:
    detail = json.loads((root / 'api/experiments' / case['task'] / case['experiment_id'] / 'detail.json').read_text())
    case['higher_is_better'] = detail['summary']['higher_is_better']
    # Mathematical metric bounds, not empirical normalization anchors (e.g. RMSE 3133).
    bounds = {
        'spearman_rho': (1, -1), 'accuracy': (1, 0), 'balanced_accuracy': (1, 0), 'exprate': (1, 0),
        'rmse_z500': (0, None), 'eer': (0, 1),
    }
    best, worst = bounds[case['metric_name']]
    case['theoretical_best'] = best
    case['theoretical_worst'] = worst
    frames = []
    for row in detail['trajectory']:
        if not 1 <= row['iteration'] <= case['total_iterations']:
            continue
        result = row.get('eval_result') or {}
        metric = result.get('primary_metric_value')
        if metric is None:
            metric = result.get('metrics', {}).get(case['metric_name'])
        frames.append(dict(iteration=row['iteration'], description=row.get('description', ''),
                           command=row.get('command', ''), files=row.get('files_written', []),
                           submitted=bool(row.get('eval_submitted')), value=metric,
                           error=(row.get('eval_error_log') or row.get('error_summary') or '')[:650]))
    case['frames'] = frames
(root / 'api/case-replays.json').write_text(json.dumps({'cases': cases}, ensure_ascii=False, separators=(',', ':')) + '\n')
