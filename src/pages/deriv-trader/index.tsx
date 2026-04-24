import React from 'react';
import { getAppId } from '@/components/shared/utils/config/config';
import './deriv-trader.scss';

const DerivTrader: React.FC = () => {
    const app_id = getAppId();
    const trader_url = `https://smarttrader.deriv.com/?app_id=${app_id}`;

    return (
        <div className='deriv-trader'>
            <iframe
                title='Deriv Trader'
                src={trader_url}
                className='deriv-trader__frame'
                allow='clipboard-read; clipboard-write'
            />
        </div>
    );
};

export default DerivTrader;
