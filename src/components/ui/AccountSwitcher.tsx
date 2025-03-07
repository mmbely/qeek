import React from 'react';
import { useAccount } from '../../context/AccountContext';
import { User, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { commonStyles, theme } from '../../styles/theme';

export const AccountSwitcher: React.FC = () => {
  const { currentAccount, availableAccounts, switchAccount } = useAccount();

  const handleAccountSwitch = async (accountId: string) => {
    try {
      await switchAccount(accountId);
    } catch (error) {
      console.error('Failed to switch account:', error);
    }
  };

  if (!currentAccount) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className={`${commonStyles.sidebar.nav.item} w-full justify-between group text-gray-100`}>
          <div className="flex items-center">
            <User className="h-5 w-5 mr-2 text-gray-100" />
            <span className="flex-1 truncate">{currentAccount.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 transition-transform ui-open:rotate-180 text-gray-100" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={`
            min-w-[200px] rounded-lg overflow-hidden shadow-lg z-50
            bg-white dark:bg-[${theme.colors.dark.background.primary}]
          `}
          align="start"
          sideOffset={5}
        >
          {availableAccounts.map((account) => (
            <DropdownMenu.Item
              key={account.id}
              onSelect={() => handleAccountSwitch(account.id)}
              className={`
            px-4 py-2 outline-none cursor-default select-none
            ${account.id === currentAccount.id 
              ? 'bg-gray-700 text-gray-100'
              : 'text-gray-300'}
            hover:bg-gray-700
            transition-colors
          `}
            >
              <div className="flex items-center">
                <div className={`
                  w-5 h-5 rounded-full flex items-center justify-center mr-2
                  bg-[${theme.colors.dark.secondary}]
                `}>
                  <span className={`
                    text-xs font-medium
                    text-[${theme.colors.dark.text.primary}]
                  `}>
                    {account.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="flex-1 truncate text-gray-100">{account.name}</span>
              </div>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
