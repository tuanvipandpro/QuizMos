// Exact retired question snapshots kept for compatible drafts and archive retries.
export const PCA_PRACTICE_REVIEW = {
  signature: 'v2:o4zhmm:366',
  legacy: 'qqpdd6:366',
  correctedSignature: 'v2:mzvsqz:366',
  originals: {
    55: {
      answer: ['D'],
      id: '55',
      retired: true,
      imageUrl: '',
      options: {
        A: 'Generate a new key in Cloud Key Management Service (Cloud KMS). Store all data in Cloud Storage using the customer-managed key option and select the created key. Set up a Dataflow pipeline to decrypt the data and to store it in a new BigQuery dataset.',
        B: 'Generate a new key in Cloud KMS. Create a dataset in BigQuery using the customer-managed key option and select the created key.',
        C: 'Import a key in Cloud KMS. Store all data in Cloud Storage using the customer-managed key option and select the created key. Set up a Dataflow pipeline to decrypt the data and to store it in a new BigQuery dataset.',
        D: 'Import a key in Cloud KMS. Create a dataset in BigQuery using the customer-supplied key option and select the created key.',
      },
      question:
        'You are designing a Data Warehouse on Google Cloud and want to store sensitive data in BigQuery. Your company requires you to generate the encryption keys outside of Google Cloud. You need to implement a solution. What should you do?',
    },
    102: {
      answer: ['C'],
      id: '102',
      retired: true,
      imageUrl: '',
      options: {
        A: 'Change the Target type to DELTA_PER_MINUTE.',
        B: 'Change the Metric identifier to agent.googleapis.com/memory/bytes_used.',
        C: "Change the filter to metric.label.state = 'used' AND metric.label.state = 'buffered' AND metric.label.state = 'cached' AND metric.label.state = 'slab'.",
        D: "Change the filter to metric.label.state = 'free' and the Target utilization to 20.",
      },
      question:
        "You have a Compute Engine application that you want to autoscale when total memory usage exceeds 80%. You have installed the Cloud Monitoring agent and configured the autoscaling policy as follows:\n✑ Metric identifier: agent.googleapis.com/memory/percent_used\n✑ Filter: metric.label.state = 'used'\n✑ Target utilization level: 80\n✑ Target type: GAUGE\nYou observe that the application does not scale under high load. You want to resolve this. What should you do?",
    },
  },
};
