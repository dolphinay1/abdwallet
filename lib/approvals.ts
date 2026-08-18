export interface TokenApproval {
  token: string;
  symbol: string;
  decimals: number;
  spender: string;
  spenderName: string;
  allowance: string;
  unlimited: boolean;
}

interface ApiApproval {
  token: string;
  tokenSymbol: string;
  decimals?: number;
  spender: string;
  spenderName: string;
  allowance: string;
  isUnlimited: boolean;
}

export async function fetchApprovals(address: string, chainId: number): Promise<TokenApproval[]> {
  try {
    const res = await fetch(`/api/approvals?address=${address}&chainId=${chainId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.approvals ?? []) as ApiApproval[]).map((a) => ({
      token: a.token,
      symbol: a.tokenSymbol,
      decimals: a.decimals ?? 18,
      spender: a.spender,
      spenderName: a.spenderName,
      allowance: a.allowance,
      unlimited: a.isUnlimited,
    }));
  } catch {
    return [];
  }
}
