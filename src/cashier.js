  Object.assign(staticCopy, {
    cashierEntry: ['Ako ang tindero · Magsukli', 'My turn as cashier · Give change'],
    cashDrawer: ['Kaha ng tindahan', 'Cash drawer'],
    changeTray: ['Sukli sa mamimili', 'Change for the customer'],
    tendered: ['Ibinayad', 'Paid'],
    pricePaid: ['Halaga', 'Cost'],
    yourChange: ['Sukli mo', 'Your change'],
    handChange: ['Iabot ang sukli', 'Give the change'],
    anotherWay: ['Ibang paraan', 'Try another way'],
    clearCashierTray: ['Alisin ang mga barya', 'Clear the tray'],
    noCashierChange: ['Walang sukli', 'No change'],
    cashierGuide: ['Gabay sa pagbilang pataas', 'Count-up guide'],
    cashierReceipts: ['Mga resibo ng klase', 'Class receipts'],
    cashierReplay: ['Laruin muli', 'Play again']
  });

  const cashierCoins = cashValues.filter(value => value <= 20);
  const cashierOrders = [
    {item: 'turon', qty: 2, unitPrice: 16, paid: 50},
    {item: 'bread', qty: 3, unitPrice: 5, paid: 20},
    {item: 'bananacue', qty: 2, unitPrice: 10, paid: 20},
    {item: 'mango', qty: 3, unitPrice: 18, paid: 100}
  ];
  const cashierCost = order => order.qty * order.unitPrice;
  const cashierItem = order => order.qty + ' × ' + t(objectTypes[order.item].singular, englishObjects[order.item][0]);

  // Count distinct combinations, so an order never asks for an impossible extra way.
  const cashierWayLimits = cashierOrders.map(order => {
    const due = order.paid - cashierCost(order);
    const ways = Array(due + 1).fill(0);
    ways[0] = 1;
    for (const coin of cashierCoins) {
      for (let total = coin; total <= due; total++) ways[total] += ways[total - coin];
    }
    return ways[due];
  });

  const cashierPractice = {
    index: 0, accepted: [], coins: emptyCash(), zero: false,
    complete: false, reviewing: false, message: 'ready'
  };

  function clearCashierTray() {
    cashierPractice.coins = emptyCash();
    cashierPractice.zero = false;
    cashierPractice.complete = false;
    cashierPractice.message = cashierPractice.accepted[cashierPractice.index].size ? 'another' : 'ready';
  }

  function speakCashierOrder() {
    const order = cashierOrders[cashierPractice.index];
    const cost = cashierCost(order);
    const sentence = t(
      'Nagkakahalaga ng ' + peso(cost) + ' ang order. Nagbayad ako ng ' + peso(order.paid) + '. Magkano ang sukli ko?',
      'My order costs ' + peso(cost) + '. I paid ' + peso(order.paid) + '. What is my change?'
    );
    void sayGame(['payA', ...numberVoiceParts(order.paid, true), 'money', 'costA',
      ...numberVoiceParts(cost, true), 'money', 'changeB'], {sentence});
  }

  function startCashierQueue() {
    cashierPractice.index = 0;
    cashierPractice.accepted = cashierOrders.map(() => new Set());
    cashierPractice.reviewing = false;
    get('cashier-guide').open = false;
    showScreen('cashier');
    get('cashier-tools').append(get('settings-open'), get('fullscreen'));
    clearCashierTray();
    renderCashierPractice();
    get('cashier-order').focus();
    speakCashierOrder();
  }

  function nextCashierCustomer() {
    const p = cashierPractice;
    if (p.reviewing || !p.accepted[p.index].size) return;
    stopGameVoice();
    if (p.index + 1 === cashierOrders.length) {
      p.reviewing = true;
      renderCashierPractice();
      get('cashier-receipt-title').focus();
      return;
    }
    p.index++;
    clearCashierTray();
    renderCashierPractice();
    get('cashier-order').focus();
    speakCashierOrder();
  }

  function cashierMessage() {
    const p = cashierPractice;
    if (p.message === 'correct') {
      const order = cashierOrders[p.index];
      return t('Tama ang sukli! ', 'Correct change! ') +
        peso(cashierCost(order)) + ' + ' + peso(cashTotal(p.coins)) + ' = ' + peso(order.paid) + '.';
    }
    const copy = {
      ready: ['Pumili ng barya o piliin ang “Walang sukli”.', 'Choose coins or select “No change”.'],
      count: ['Pindutin ang barya sa bandeha para ibalik ito sa kaha.', 'Tap a coin in the tray to return it to the drawer.'],
      zero: ['₱0 ang pinili mong sukli. Iabot ito kapag handa ka na.', 'You chose ₱0 in change. Give the change when you are ready.'],
      empty: ['Maglagay muna ng barya o piliin ang “Walang sukli”.', 'Put a coin in the tray or select “No change” first.'],
      short: ['Kulang pa ang sukli. Magkano na ang halaga kapag idinagdag ang mga barya sa presyo?', 'The change is short. What do you get if you add your coins to the cost?'],
      over: ['Sobra ang sukli. Aling barya ang maaari mong ibalik sa kaha?', 'That is too much change. Which coin could you return to the drawer?'],
      another: ['Buuin ang parehong sukli gamit ang ibang kombinasyon ng barya.', 'Make the same change with a different combination of coins.'],
      duplicate: ['Tama ang halaga. Nagamit mo na ang kombinasyong ito. Subukan ang ibang mga barya.', 'The amount is right. You already used that combination. Try different coins.']
    };
    return t(...copy[p.message]);
  }

  function checkCashierPractice() {
    const p = cashierPractice;
    if (state.screen !== 'cashier' || p.reviewing || p.complete) return;
    const order = cashierOrders[p.index];
    const total = cashTotal(p.coins);
    const due = order.paid - cashierCost(order);
    const key = p.coins.join(',');
    if (!total && !p.zero) {
      p.message = 'empty';
    } else if (total !== due) {
      p.message = total < due ? 'short' : 'over';
      actionSound('wrong');
      void sayGame(['wrongChange'], {sentence: cashierMessage()});
    } else if (p.accepted[p.index].has(key)) {
      p.message = 'duplicate';
      actionSound('return');
    } else {
      p.accepted[p.index].add(key);
      p.complete = true;
      p.message = 'correct';
      actionSound('correct');
      void sayGame(['correct'], {sentence: cashierMessage()});
    }
    renderCashierTray();
    if (p.complete) get('cashier-next').focus({preventScroll: true});
  }

  // Keep the buttons in place as amounts change, including during keyboard play.
  function cashierCoinButton(value, takeBack) {
    return '<button type="button" class="sv-coin" data-sv-coin="' + value + '"' +
      (takeBack ? ' data-sv-takeback' : '') + '>' + currencyArt(value) +
      '<strong class="sv-coin-value">' + peso(value) + '</strong></button>';
  }
  get('cashier-drawer').innerHTML = cashierCoins.map(value => cashierCoinButton(value, false)).join('');
  get('cashier-tray').innerHTML = '<span data-ma="cashier-empty"></span>' + cashierCoins.map(value =>
    '<span class="sv-coin-stack" hidden>' + cashierCoinButton(value, true) + '<b></b></span>'
  ).join('');
  const cashierButtons = cashierCoins.map(value => {
    const selector = '[data-sv-coin="' + value + '"]';
    return {value, position: cashValues.indexOf(value),
      give: get('cashier-drawer').querySelector(selector), take: get('cashier-tray').querySelector(selector)};
  });

  function renderCashierTray() {
    const p = cashierPractice;
    const order = cashierOrders[p.index];
    const cost = cashierCost(order);
    const total = cashTotal(p.coins);
    const ways = p.accepted[p.index].size;
    for (const {give, take, position} of cashierButtons) {
      give.disabled = take.disabled = p.complete;
      const count = p.coins[position];
      take.parentElement.hidden = count === 0;
      take.nextElementSibling.textContent = '× ' + count;
    }
    get('cashier-empty').hidden = total > 0;
    get('cashier-empty').textContent = p.zero ? t('Walang sukli · ₱0', 'No change · ₱0') :
      t('Ilagay dito ang sukli.', 'Place the change here.');
    get('cashier-total').textContent = (total > 0 || p.zero) ? peso(total) : '?';
    get('cashier-zero').setAttribute('aria-pressed', String(p.zero));
    get('cashier-zero').disabled = p.complete;
    get('cashier-guide-equation').textContent = peso(cost) + ' + ' + peso(total) + ' = ' + peso(cost + total);
    get('cashier-feedback').textContent = cashierMessage();
    get('cashier-feedback').dataset.tone = p.complete ? 'correct' : '';
    get('cashier-check').hidden = p.complete;
    get('cashier-next').hidden = ways === 0;
    get('cashier-another').hidden = !p.complete || ways >= cashierWayLimits[p.index];
    get('cashier-reset').hidden = p.complete;
  }

  function renderCashierPractice() {
    const p = cashierPractice;
    get('cashier-playing').hidden = p.reviewing;
    get('cashier-receipts').hidden = !p.reviewing;
    if (p.reviewing) {
      get('cashier-progress').textContent = t('Napagsilbihan ang lahat ng mamimili.', 'Every customer has been served.');
      get('cashier-receipt-list').innerHTML = cashierOrders.map((order, i) => {
        const cost = cashierCost(order);
        const ways = p.accepted[i].size;
        return '<li>' + shopArt(order.item) + '<div><strong>' + escapeHTML(cashierItem(order)) +
          '</strong><small>' + peso(order.paid) + ' − ' + peso(cost) + ' = ' + peso(order.paid - cost) +
          '</small></div><span>' + ways + t(' paraan', ways === 1 ? ' way' : ' ways') + '</span></li>';
      }).join('');
      return;
    }
    const order = cashierOrders[p.index];
    const cost = cashierCost(order);
    get('cashier-progress').textContent = t('Mamimili ', 'Customer ') + (p.index + 1) +
      t(' sa ', ' of ') + cashierOrders.length;
    get('cashier-order').textContent = cashierItem(order) + ' · ' + peso(order.unitPrice) + t(' bawat isa', ' each');
    get('cashier-customer').textContent = t('“Pabili po! Heto ang ', '“Here is ') + peso(order.paid) + '.”';
    get('cashier-food').innerHTML = shopArt(order.item).repeat(order.qty);
    get('cashier-note').innerHTML = currencyArt(order.paid);
    get('cashier-paid').textContent = peso(order.paid);
    get('cashier-cost').textContent = '− ' + peso(cost);
    get('cashier-guide-instruction').textContent = t(
      'Magsimula sa ' + peso(cost) + '. Idagdag ang mga barya hanggang umabot sa ' + peso(order.paid) + '.',
      'Start at ' + peso(cost) + '. Add your coins until you reach ' + peso(order.paid) + '.'
    );
    get('cashier-next').textContent = p.index + 1 === cashierOrders.length ?
      t('Tingnan ang mga resibo', 'See class receipts') : t('Susunod na mamimili', 'Next customer');
    for (const {value, give, take} of cashierButtons) {
      give.setAttribute('aria-label', t('Magbigay ng ', 'Give ') + peso(value));
      take.setAttribute('aria-label', t('Ibalik ang ', 'Take back ') + peso(value));
    }
    renderCashierTray();
  }

  function selectCashierCoin(event) {
    const p = cashierPractice;
    const button = event.target.closest('[data-sv-coin]');
    if (!button || state.screen !== 'cashier' || p.reviewing || p.complete) return;
    const value = Number(button.dataset.svCoin);
    const position = cashValues.indexOf(value);
    const takingBack = button.hasAttribute('data-sv-takeback');
    if ((takingBack && !p.coins[position]) || (!takingBack && cashTotal(p.coins) + value > 999)) return;
    p.coins[position] += takingBack ? -1 : 1;
    p.zero = false;
    p.message = 'count';
    actionSound(takingBack ? 'return' : 'coin');
    renderCashierTray();
    void sayGame([...numberVoiceParts(value, true), 'money']);
    if (takingBack && !p.coins[position]) {
      get('cashier-drawer').querySelector('[data-sv-coin="' + value + '"]').focus({preventScroll: true});
    }
  }

  get('cashier-open').addEventListener('click', startCashierQueue);
  get('cashier-replay').addEventListener('click', startCashierQueue);
  get('cashier-back').addEventListener('click', () => {
    stopGameVoice();
    showScreen('shop-setup');
    renderShopSetup();
    get('cashier-open').focus();
  });
  get('cashier-drawer').addEventListener('click', selectCashierCoin);
  get('cashier-tray').addEventListener('click', selectCashierCoin);
  get('cashier-zero').addEventListener('click', () => {
    cashierPractice.zero = !cashierPractice.zero;
    cashierPractice.coins = emptyCash();
    cashierPractice.message = cashierPractice.zero ? 'zero' : 'ready';
    renderCashierTray();
  });
  get('cashier-check').addEventListener('click', checkCashierPractice);
  get('cashier-next').addEventListener('click', nextCashierCustomer);
  get('cashier-another').addEventListener('click', () => {
    clearCashierTray();
    renderCashierTray();
    cashierButtons[0].give.focus();
  });
  get('cashier-reset').addEventListener('click', () => {
    clearCashierTray();
    renderCashierTray();
  });
