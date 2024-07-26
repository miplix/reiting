const axios = require('axios');
const fs = require('fs');

async function fetchNFTData() {
  const url = 'https://graph.mintbase.xyz/mainnet';
  const query = `
    query {
      mb_views_nft_tokens(
        where: {nft_contract_id: {_eq: "darai.mintbase1.near"}}
      ) {
        owner
        title
      }
    }
  `;

  try {
    const response = await axios.post(url, { query }, {
      headers: { 'mb-api-key': 'anon' }
    });
    return response.data.data.mb_views_nft_tokens;
  } catch (error) {
    console.error('Ошибка запроса:', error.response ? `${error.response.status} - ${error.response.statusText}` : error.message);
    return null;
  }
}

function parseStakingPower(title) {
  const mapping = {
    '0': '100%',
    '1': '50%',
    '2': '25%',
    '3': '12.5%',
    '4': '6.25%',
    'legendary': '3.125%',
    'epic': '1.5625%',
    'rare': '0.78125%',
    'uncommon': '0.390625%',
    'common': '0.1953125%'
  };

  const matchedKey = Object.keys(mapping).find(key => title.toLowerCase().includes(key));
  return matchedKey ? mapping[matchedKey] : 'N/A';
}

function convertStakingPowerToNumber(stakingPower) {
  const mapping = {
    '100%': 100,
    '50%': 50,
    '25%': 25,
    '12.5%': 12.5,
    '6.25%': 6.25,
    '3.125%': 3.125,
    '1.5625%': 1.5625,
    '0.78125%': 0.78125,
    '0.390625%': 0.390625,
    '0.1953125%': 0.1953125,
  };

  return mapping[stakingPower] || 0;
}

function shouldIncludeNFT(title, owner) {
  const excludeWords = ['passport', 'egg', 'yupik - chiter', 'тест', 'boost'];
  return !excludeWords.some(word => title ? title.toLowerCase().includes(word.toLowerCase()) : false) &&
         owner !== 'darai_nft.near';
}

async function main() {
  const totalAllocation = 100000000; // Общий объем аллокации

  const nftData = await fetchNFTData();
  if (nftData) {
    const ownerStakingPower = {};

    nftData.forEach(nft => {
      if (nft.owner !== '0000000000000000000000000000000000000000000000000000000000000000' && 
          shouldIncludeNFT(nft.title, nft.owner)) {
        const stakingPower = parseStakingPower(nft.title);
        const stakingPowerValue = convertStakingPowerToNumber(stakingPower);

        if (!ownerStakingPower[nft.owner]) {
          ownerStakingPower[nft.owner] = 0;
        }
        ownerStakingPower[nft.owner] += stakingPowerValue;
      }
    });

    // Вычисляем общую мощность
    const totalPower = Object.values(ownerStakingPower).reduce((acc, value) => acc + value, 0);

    // Вычисляем награду на 1% мощности
    const rewardPerPercent = totalAllocation / totalPower;

    // Создаем текстовый файл с информацией о владельцах и суммарной мощности
    let summaryText = '';
    Object.entries(ownerStakingPower).forEach(([owner, totalPower]) => {
      summaryText += `${owner};${totalPower.toFixed(8)}\n`; // Точная запись
    });
    fs.writeFileSync('nft_summary.txt', summaryText);

    // Создаем текстовый файл с расчетом награды для каждого владельца
    let rewardText = '';
    Object.entries(ownerStakingPower).forEach(([owner, totalPower]) => {
      const reward = Math.floor(rewardPerPercent * totalPower);
      rewardText += `${owner};${reward}\n`;
    });
    fs.writeFileSync('nft_rewards.txt', rewardText);

    console.log('OK');
  } else {
    console.log('Нет данных для сохранения');
  }
}

main();
