function d3_transition(groups, id, time) {
  d3_arraySubclass(groups, d3_transitionPrototype);

  var tweens = new d3_Map,
      event = d3.dispatch("start", "end"),
      ease = d3_transitionEase;

  groups.id = id;

  groups.time = time;

  groups.tween = function(name, tween) {
    if (arguments.length < 2) return tweens.get(name);
    if (tween == null) tweens.remove(name);
    else tweens.set(name, tween);
    return groups;
  };

  groups.ease = function(value) {
    if (!arguments.length) return ease;
    ease = typeof value === "function" ? value : d3.ease.apply(d3, arguments);
    return groups;
  };

  groups.each = function(type, listener) {
    if (arguments.length < 2) return d3_transition_each.call(groups, type);
    event.on(type, listener);
    return groups;
  };

  d3.timer(function(elapsed) {
    var hasTweens = tweens.values().length > 0; // for .remove() transitions without tweens
    groups.each(function(d, i, j) {
      var tweened = [],
          locks = [], // locks ordered similar to tweened
          node = this,
          delay = groups[j][i].delay,
          duration = groups[j][i].duration,
          // lock is a map from tween name to { active: int, count: int }
          lock = node.__transition__ || (node.__transition__ = {});

      // create tween locks
      tweens.forEach(function(key, value) {
         if (key in lock) {
             ++lock[key].count;
         } else {
             lock[key] = { active: 0, count: 1 }; // lock entry per tween
         }
      });

      delay <= elapsed ? start(elapsed) : d3.timer(start, delay, time);

      function start(elapsed) {
        tweens.forEach(function(key, value) {
          var currentLock = lock[key];
          if (currentLock.active > id) {
              return;
          }
          currentLock.active = id;

          if (tween = value.call(node, d, i)) {
            tweened.push(tween);
            locks.push(currentLock);
          }
        });

        event.start.call(node, d, i);
        if (!tick(elapsed)) d3.timer(tick, 0, time);
        return 1;
      }

      function tick(elapsed) {
        var t = (elapsed - delay) / duration,
            e = ease(t),
            n = tweened.length;

        var tweenExecuted = false;
        while (n > 0) {
          --n;
          if (locks[n].active !== id) {
              continue;
          }
          tweened[n].call(node, e);
          tweenExecuted = true;
        }

        if (hasTweens && !tweenExecuted) {
          return stop();
        }

        if (t >= 1) {
          stop();
          d3_transitionId = id;
          event.end.call(node, d, i);
          d3_transitionId = 0;
          return 1;
        }
      }

      function stop() {
        // decrease all locks and delete when empty
        tweens.forEach(function(key, value) {
            if (!--lock[key].count) delete lock[key];
        });

        var containsTweenLock = false, key;
        for (key in lock) {
          if (lock.hasOwnProperty(key)) {
              containsTweenLock = true;
              break;
          }
        }

        if (!containsTweenLock) delete node.__transition__;

        return 1;
      }
    });
    return 1;
  }, 0, time);

  return groups;
}

var d3_transitionRemove = {};

function d3_transitionNull(d, i, a) {
  return a != "" && d3_transitionRemove;
}

function d3_transitionTween(name, b) {
  var interpolate = d3_interpolateByName(name);

  function transitionFunction(d, i, a) {
    var v = b.call(this, d, i);
    return v == null
        ? a != "" && d3_transitionRemove
        : a != v && interpolate(a, v);
  }

  function transitionString(d, i, a) {
    return a != b && interpolate(a, b);
  }

  return typeof b === "function" ? transitionFunction
      : b == null ? d3_transitionNull
      : (b += "", transitionString);
}

var d3_transitionPrototype = [],
    d3_transitionNextId = 0,
    d3_transitionId = 0,
    d3_transitionDefaultDelay = 0,
    d3_transitionDefaultDuration = 250,
    d3_transitionDefaultEase = d3.ease("cubic-in-out"),
    d3_transitionDelay = d3_transitionDefaultDelay,
    d3_transitionDuration = d3_transitionDefaultDuration,
    d3_transitionEase = d3_transitionDefaultEase;

d3_transitionPrototype.call = d3_selectionPrototype.call;

d3.transition = function(selection) {
  return arguments.length
      ? (d3_transitionId ? selection.transition() : selection)
      : d3_selectionRoot.transition();
};

d3.transition.prototype = d3_transitionPrototype;
